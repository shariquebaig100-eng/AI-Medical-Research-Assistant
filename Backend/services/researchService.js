const axios = require('axios');
const xml2js = require('xml2js');

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const OPENALEX_BASE = 'https://api.openalex.org';
const TRIALS_BASE = 'https://clinicaltrials.gov/api/v2';
const Groq = require('groq-sdk');
const EXPANSION_MODEL = 'llama-3.1-8b-instant'; // fast small model for query expansion

// ─── LLM-powered Query Expansion ─────────────────────────────────────────────
// Uses Mistral to generate semantically rich search variants before retrieval.
// Falls back to deterministic expansion if the LLM is unavailable.
async function expandQuery(query, disease, intent) {
  const base = disease ? `${query} ${disease}` : query;

  // Deterministic fallback variants (always computed)
  const fallbackVariants = [base];
  if (disease && !query.toLowerCase().includes(disease.toLowerCase())) {
    fallbackVariants.push(`${disease} treatment`);
    fallbackVariants.push(`${disease} clinical trial`);
  }
  if (intent) fallbackVariants.push(`${base} ${intent}`);

  // Attempt LLM expansion
  try {
    const prompt = `Generate exactly 3 optimised PubMed medical database search queries for the following:

User query: "${query}"
${disease ? `Disease context: "${disease}"` : ''}
${intent ? `Specific interest: "${intent}"` : ''}

Rules:
- Each query must be medically precise and specific
- Use MeSH-style terminology
- Vary the focus: one broad, one treatment-focused, one trial-focused
- Respond with ONLY a JSON array of 3 strings. Example: ["query 1", "query 2", "query 3"]`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: EXPANSION_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.2
    });

    const raw = (completion.choices[0]?.message?.content || '').trim();
    // Extract JSON array from response
    const match = raw.match(/\[.*?\]/s);
    const jsonStr = match ? match[0] : raw;
    const llmVariants = JSON.parse(jsonStr);

    if (Array.isArray(llmVariants) && llmVariants.length > 0) {
      const allVariants = [base, ...llmVariants].filter(Boolean);
      const unique = [...new Set(allVariants)];
      console.log(`🧠 LLM expanded query into ${unique.length} variants:`, unique);
      return { primary: base, variants: unique, llmExpanded: true };
    }
  } catch (err) {
    // Silently fall back — don't block retrieval
    console.log(`⚠️  LLM query expansion unavailable, using fallback: ${err.message}`);
  }

  return { primary: base, variants: [...new Set(fallbackVariants)], llmExpanded: false };
}

// ─── Ranking ──────────────────────────────────────────────────────────────────
function rankResults(items, query, disease) {
  const keywords = [query, disease]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .split(' ')
    .filter(w => w.length > 3);

  return items
    .map(item => {
      let score = 0;
      const text = `${item.title} ${item.abstract || ''}`.toLowerCase();

      // Keyword relevance
      keywords.forEach(kw => {
        const matches = (text.match(new RegExp(kw, 'g')) || []).length;
        score += matches * 2;
      });

      // Recency boost (last 5 years)
      if (item.year) {
        const age = new Date().getFullYear() - parseInt(item.year);
        if (age <= 1) score += 15;
        else if (age <= 3) score += 10;
        else if (age <= 5) score += 5;
      }

      // Citation boost (OpenAlex)
      if (item.citedByCount) score += Math.min(item.citedByCount / 50, 10);

      return { ...item, _score: score };
    })
    .sort((a, b) => b._score - a._score);
}

// ─── PubMed ───────────────────────────────────────────────────────────────────
async function fetchPubMed(query, disease, maxResults = 100) {
  try {
    const searchQuery = disease
      ? `${query} AND ${disease}[MeSH Terms OR Title]`
      : query;

    const apiKey = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : '';

    // Step 1: Search for IDs
    const searchRes = await axios.get(
      `${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchQuery)}&retmax=${maxResults}&sort=pub+date&retmode=json${apiKey}`,
      { timeout: 10000 }
    );

    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    // Fetch in batches of 50
    const batchSize = 50;
    const allArticles = [];

    for (let i = 0; i < Math.min(ids.length, maxResults); i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize).join(',');
      const fetchRes = await axios.get(
        `${NCBI_BASE}/efetch.fcgi?db=pubmed&id=${batchIds}&retmode=xml${apiKey}`,
        { timeout: 15000 }
      );

      const parsed = await xml2js.parseStringPromise(fetchRes.data, { explicitArray: false });
      const articles = parsed?.PubmedArticleSet?.PubmedArticle;
      if (!articles) continue;

      const articleList = Array.isArray(articles) ? articles : [articles];

      articleList.forEach(article => {
        try {
          const medline = article.MedlineCitation;
          const articleData = medline.Article;
          const pmid = medline.PMID?._ || medline.PMID;

          // Authors
          const authorList = articleData.AuthorList?.Author;
          let authors = [];
          if (authorList) {
            const authArr = Array.isArray(authorList) ? authorList : [authorList];
            authors = authArr.slice(0, 5).map(a =>
              `${a.ForeName || ''} ${a.LastName || ''}`.trim()
            ).filter(Boolean);
          }

          // Year
          const pubDate = articleData.Journal?.JournalIssue?.PubDate;
          const year = pubDate?.Year || pubDate?.MedlineDate?.substring(0, 4) || 'N/A';

          // Abstract
          const abstractText = articleData.Abstract?.AbstractText;
          let abstract = '';
          if (typeof abstractText === 'string') abstract = abstractText;
          else if (Array.isArray(abstractText)) abstract = abstractText.map(a => a._ || a).join(' ');
          else if (abstractText?._) abstract = abstractText._;

          allArticles.push({
            id: `pubmed_${pmid}`,
            title: articleData.ArticleTitle?._ || articleData.ArticleTitle || 'Untitled',
            abstract: abstract.substring(0, 800),
            authors,
            year,
            source: 'PubMed',
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            pmid
          });
        } catch (e) {
          // Skip malformed articles
        }
      });
    }

    return allArticles;
  } catch (err) {
    console.error('PubMed fetch error:', err.message);
    return [];
  }
}

// ─── OpenAlex ─────────────────────────────────────────────────────────────────
async function fetchOpenAlex(query, disease, maxResults = 100) {
  try {
    const searchQuery = disease ? `${query} ${disease}` : query;
    const perPage = Math.min(maxResults, 100);
    const pages = Math.ceil(maxResults / perPage);
    const allWorks = [];

    for (let page = 1; page <= pages; page++) {
      const res = await axios.get(`${OPENALEX_BASE}/works`, {
        params: {
          search: searchQuery,
          'per-page': perPage,
          page,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2018-01-01',
          select: 'id,title,abstract_inverted_index,authorships,publication_year,cited_by_count,primary_location,open_access'
        },
        timeout: 10000
      });

      const works = res.data?.results || [];
      if (!works.length) break;

      works.forEach(work => {
        // Reconstruct abstract from inverted index
        let abstract = '';
        if (work.abstract_inverted_index) {
          const wordMap = {};
          Object.entries(work.abstract_inverted_index).forEach(([word, positions]) => {
            positions.forEach(pos => { wordMap[pos] = word; });
          });
          abstract = Object.keys(wordMap)
            .sort((a, b) => a - b)
            .map(k => wordMap[k])
            .join(' ')
            .substring(0, 800);
        }

        const authors = (work.authorships || [])
          .slice(0, 5)
          .map(a => a.author?.display_name)
          .filter(Boolean);

        const url = work.primary_location?.landing_page_url ||
          work.open_access?.oa_url ||
          `https://openalex.org/${work.id}`;

        allWorks.push({
          id: `openalex_${work.id}`,
          title: work.title || 'Untitled',
          abstract,
          authors,
          year: work.publication_year?.toString() || 'N/A',
          citedByCount: work.cited_by_count || 0,
          source: 'OpenAlex',
          url
        });
      });
    }

    return allWorks;
  } catch (err) {
    console.error('OpenAlex fetch error:', err.message);
    return [];
  }
}

// ─── ClinicalTrials ───────────────────────────────────────────────────────────
async function fetchClinicalTrials(query, disease, location, maxResults = 30) {
  try {
    const condition = disease || query;

    const params = {
      'query.cond': condition,
      pageSize: maxResults,
      format: 'json',
      fields: 'NCTId,BriefTitle,OverallStatus,EligibilityCriteria,LocationFacility,CentralContactName,CentralContactPhone,CentralContactEMail,Phase,EnrollmentCount,StudyType,Condition,BriefSummary,StartDate,CompletionDate'
    };

    // Add status filter to get active studies
    params['filter.overallStatus'] = 'RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING';

    if (location) {
      params['query.locn'] = location;
    }

    const res = await axios.get(`${TRIALS_BASE}/studies`, { params, timeout: 10000 });
    const studies = res.data?.studies || [];

    return studies.map(study => {
      const proto = study.protocolSection || {};
      const ident = proto.identificationModule || {};
      const status = proto.statusModule || {};
      const eligibility = proto.eligibilityModule || {};
      const contacts = proto.contactsLocationsModule || {};

      const locations = (contacts.locations || []).slice(0, 3).map(loc =>
        [loc.facility, loc.city, loc.country].filter(Boolean).join(', ')
      );

      const centralContact = contacts.centralContacts?.[0] || {};

      return {
        id: `trial_${ident.nctId}`,
        nctId: ident.nctId,
        title: ident.briefTitle || 'Untitled Trial',
        status: status.overallStatus || 'Unknown',
        phase: proto.designModule?.phases?.join(', ') || 'N/A',
        eligibilityCriteria: (eligibility.eligibilityCriteria || '').substring(0, 600),
        locations: locations.length ? locations : ['Location not specified'],
        contactName: centralContact.name || 'N/A',
        contactPhone: centralContact.phone || 'N/A',
        contactEmail: centralContact.email || 'N/A',
        enrollment: status.enrollmentInfo?.count || 'N/A',
        summary: (proto.descriptionModule?.briefSummary || '').substring(0, 400),
        startDate: status.startDateStruct?.date || 'N/A',
        url: `https://clinicaltrials.gov/study/${ident.nctId}`
      };
    });
  } catch (err) {
    console.error('ClinicalTrials fetch error:', err.message);
    return [];
  }
}


// ─── Researcher mode: extract top authors ────────────────────────────────────
function extractTopResearchers(works, disease) {
  const authorMap = {};
  works.forEach(work => {
    (work.authors || []).forEach(name => {
      if (!authorMap[name]) {
        authorMap[name] = { name, papers: 0, totalCitations: 0, recentWork: work.title, recentYear: work.year, url: work.url };
      }
      authorMap[name].papers++;
      authorMap[name].totalCitations += work.citedByCount || 0;
    });
  });
  return Object.values(authorMap)
    .filter(a => a.papers >= 1)
    .sort((a, b) => b.totalCitations - a.totalCitations)
    .slice(0, 8)
    .map((a, i) => ({
      id: 'researcher_' + i,
      title: a.name,
      abstract: a.papers + ' publication(s) on ' + (disease || 'this topic') + ' · ' + a.totalCitations.toLocaleString() + ' total citations · Recent: "' + (a.recentWork || '').substring(0, 80) + '..."',
      authors: [a.name],
      year: a.recentYear,
      citedByCount: a.totalCitations,
      source: 'OpenAlex',
      url: a.url,
      isResearcher: true
    }));
}

// ─── Main Retrieval Orchestrator ──────────────────────────────────────────────
async function retrieveResearch({ query, disease, intent, location, researcherMode = false }) {
  const expanded = await expandQuery(query, disease, intent);
  console.log(`🔍 Query expanded (LLM=${expanded.llmExpanded}): "${expanded.primary}"`);
  if (expanded.variants.length > 1) console.log(`   Variants: ${expanded.variants.slice(1).join(' | ')}`);

  const pubmedQuery   = expanded.variants[1] || expanded.primary;
  const openalexQuery = expanded.primary;
  const openalexLimit = researcherMode ? 200 : 100;

  const [pubmedResults, openalexResults, trialsResults] = await Promise.allSettled([
    fetchPubMed(pubmedQuery, disease, 100),
    fetchOpenAlex(openalexQuery, disease, openalexLimit),
    fetchClinicalTrials(query, disease, location, 30)
  ]);

  const pubmed   = pubmedResults.status  === 'fulfilled' ? pubmedResults.value  : [];
  const openalex = openalexResults.status === 'fulfilled' ? openalexResults.value : [];
  const trials   = trialsResults.status  === 'fulfilled' ? trialsResults.value  : [];
  console.log(`📚 Retrieved: ${pubmed.length} PubMed, ${openalex.length} OpenAlex, ${trials.length} Trials`);

  const seenTitles = new Set();
  const combinedPublications = [...pubmed, ...openalex].filter(item => {
    const key = item.title.toLowerCase().substring(0, 60);
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  let finalPublications;
  if (researcherMode) {
    const researchers = extractTopResearchers(openalex, disease);
    finalPublications = researchers.length > 0 ? researchers : rankResults(combinedPublications, query, disease).slice(0, 8);
    console.log(`👩‍🔬 Researcher mode: ${researchers.length} top authors found`);
  } else {
    finalPublications = rankResults(combinedPublications, query, disease).slice(0, 8);
  }

  return {
    publications: finalPublications,
    trials: trials.slice(0, 6),
    totalRetrieved: { pubmed: pubmed.length, openalex: openalex.length, trials: trials.length },
    expandedQuery: expanded.primary,
    llmExpanded: expanded.llmExpanded,
    queryVariants: expanded.variants,
    researcherMode
  };
}

module.exports = { retrieveResearch, expandQuery };