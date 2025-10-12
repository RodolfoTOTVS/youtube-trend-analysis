# Scripts utilizados no workflow

## 1. Aggregate LLM Input
```javascript
function daysSince(dateStr) {
  if (!dateStr) return 1;
  const d = new Date(dateStr);
  const today = new Date();
  const diffMs = Math.max(0, today - d);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

function iqr(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a,b)=>a-b);
  const q1 = s[Math.floor((s.length - 1) * 0.25)];
  const q3 = s[Math.floor((s.length - 1) * 0.75)];
  return q3 - q1;
}

function normPercentile(sortedArr, value) {
  if (!sortedArr.length) return 0.5;
  const n = sortedArr.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (sortedArr[i] <= value) count++;
    else break;
  }
  return Math.max(0, Math.min(1, (count - 1) / Math.max(1, n - 1)));
}

const videoNodeItems = $items("GET VIDEO YT") || [];
let videoList = [];
for (const it of videoNodeItems) {
  if (it.json && Array.isArray(it.json.items)) {
    videoList = videoList.concat(it.json.items);
  } else if (it.json && it.json.id && (it.json.snippet || it.json.statistics)) {
    videoList.push(it.json);
  }
}

const channelNodeItems = $items("GET CHANNEL YT") || [];
const channelMap = {};
for (const it of channelNodeItems) {
  if (it.json && Array.isArray(it.json.items)) {
    for (const ch of it.json.items) {
      const id = ch.id;
      const subs = Number(ch.statistics?.subscriberCount || 0);
      channelMap[id] = { subscriberCount: subs, raw: ch };
    }
  } else if (it.json && it.json.id) {
    const ch = it.json;
    channelMap[ch.id] = { subscriberCount: Number(ch.statistics?.subscriberCount || 0), raw: ch };
  }
}

const rows = videoList.map(v => {
  const snippet = v.snippet || {};
  const stats = v.statistics || {};
  const content = v.contentDetails || {};
  const publishDate = snippet.publishedAt || v.publishedAt || null;
  const views = Number(stats.viewCount || 0);
  const likes = Number(stats.likeCount || 0);
  const comments = Number(stats.commentCount || 0);
  const channelId = snippet.channelId || v.channelId || null;
  const channelTitle = snippet.channelTitle || v.channelTitle || '';
  const channelSubs = channelMap[channelId]?.subscriberCount || 0;

  const days = daysSince(publishDate);
  const views_per_day = views / days;
  const log_views = Math.log10(views + 1);
  const engagement_rate = (likes + comments) / Math.max(views, 1);
  const like_rate = likes / Math.max(views, 1);

  return { id: v.id, snippet, stats, content, publishDate, views, likes, comments, channelId, channelTitle, channelSubs,
           days, views_per_day, log_views, engagement_rate, like_rate };
});

const avg_views_per_day = rows.reduce((s, r) => s + r.views_per_day, 0) / rows.length;
const avg_engagement = rows.reduce((s, r) => s + r.engagement_rate, 0) / rows.length;

const arr_vpd = rows.map(r => r.views_per_day).slice().sort((a,b)=>a-b);
const arr_lv = rows.map(r => r.log_views).slice().sort((a,b)=>a-b);
const arr_eng = rows.map(r => r.engagement_rate).slice().sort((a,b)=>a-b);
const arr_like = rows.map(r => r.like_rate).slice().sort((a,b)=>a-b);
const arr_subs = rows.map(r => r.channelSubs).slice().sort((a,b)=>a-b);

const bigThreshold = 100000;
const bigChannelsCount = rows.filter(r => r.channelSubs >= bigThreshold).length;

const weights = {
  views_per_day: 0.30,
  log_views: 0.20,
  engagement_rate: 0.20,
  like_rate: 0.10,
  channel_subs: 0.10,
  competition: 0.10
};

const iqr_vpd = iqr(arr_vpd);
const iqr_eng = iqr(arr_eng);
const q3_vpd = arr_vpd[Math.floor((arr_vpd.length - 1) * 0.75)] || 0;
const q3_eng = arr_eng[Math.floor((arr_eng.length - 1) * 0.75)] || 0;

function pct(aSorted, v) {
  return normPercentile(aSorted, v);
}

const results = rows.map(r => {
  const n_vpd = pct(arr_vpd, r.views_per_day);
  const n_lv = pct(arr_lv, r.log_views);
  const n_eng = pct(arr_eng, r.engagement_rate);
  const n_like = pct(arr_like, r.like_rate);
  const n_subs = pct(arr_subs, r.channelSubs);
  const n_comp = 1 - (r.channelSubs >= bigThreshold ? 1 : 0);

  const baseScore = (
    (weights.views_per_day * n_vpd) +
    (weights.log_views * n_lv) +
    (weights.engagement_rate * n_eng) +
    (weights.like_rate * n_like) +
    (weights.channel_subs * n_subs) +
    (weights.competition * n_comp)
  );

  const outlierBoost = (r.views_per_day > avg_views_per_day * 2) ? 1.3 : 1;
  const final_score = Math.round(baseScore * outlierBoost * 100);

  return {
    json: {
      id: r.id,
      title: r.snippet?.title || '',
      description: r.snippet?.description || '',
      publishDate: r.publishDate,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      duration: r.content?.duration || null,
      channelId: r.channelId,
      channelTitle: r.channelTitle,
      channelSubs: r.channelSubs,
      computed_metrics: {
        views_per_day: Number(r.views_per_day.toFixed(4)),
        log_views: Number(r.log_views.toFixed(4)),
        engagement_rate: Number(r.engagement_rate.toFixed(4)),
        like_rate: Number(r.like_rate.toFixed(4))
      },
      computed_score: Math.round(baseScore * 100),
      final_score,
      outlier_boost: outlierBoost,
      bigChannelsInSample: bigChannelsCount,
      weights_used: weights
    }
  };
});

return results;
```
## 2. Parse LLM Output
```javascript
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch) {
    const maybe = safeJsonParse(codeFenceMatch[1].trim());
    if (maybe) return maybe;
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const substring = text.slice(firstBrace, lastBrace + 1);
    const maybe = safeJsonParse(substring);
    if (maybe) return maybe;
  }

  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const substring = text.slice(firstBracket, lastBracket + 1);
    const maybe = safeJsonParse(substring);
    if (maybe) return maybe;
  }

  const replaced = text
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"');
  const maybe = safeJsonParse(replaced);
  if (maybe) return maybe;

  return null;
}

try {
  const payload = items[0].json || {};
  let content = null;
  
  if (payload.message && typeof payload.message.content === 'string') {
    content = payload.message.content;
  }

  else if (payload.body && payload.body.choices && payload.body.choices[0]) {
    const c = payload.body.choices[0];
    content = c.message?.content || c.text || c.delta?.content || null;
  }
  else if (payload.choices && payload.choices[0]) {
    const c = payload.choices[0];
    content = c.message?.content || c.text || null;
  }
  else if (payload.content && typeof payload.content === 'string') {
    content = payload.content;
  } else if (payload.text && typeof payload.text === 'string') {
    content = payload.text;
  }

  if (!content) {
    content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  let parsed = safeJsonParse(content);

  if (!parsed) {
    parsed = extractJsonFromText(content);
  }

  if (!parsed && payload.message && typeof payload.message === 'object') {
    parsed = payload.message;
  }

  if (!parsed) {

    const possible = payload.ideias || payload.ideas || payload.items || payload.data;
    if (possible) {
      if (Array.isArray(possible)) {
        parsed = { ideias: possible };
      } else if (typeof possible === 'object') {
        parsed = possible;
      }
    }
  }

  if (!parsed) {
    console.error('Parse LLM Output: não foi possível extrair JSON do conteúdo do LLM. Conteúdo recebido:', content.slice(0, 1000));
    return []; 
  }

  const ideias = parsed.ideias || parsed.ideas || parsed.Ideias || parsed.Ideas || [];
  const nicheValue = parsed.nicho || parsed.niche || (payload.nicho || payload.niche) || '';
  const dateValue = parsed.data_analise || parsed.data || parsed.date || (payload.data_analise || '');

  let finalIdeas = [];
  if (Array.isArray(ideias)) {
    finalIdeas = ideias;
  } else if (typeof parsed === 'object') {
    const arrProp = Object.values(parsed).find(v => Array.isArray(v));
    if (arrProp) finalIdeas = arrProp;
  }

  if (finalIdeas.length === 0 && Array.isArray(parsed)) {
    finalIdeas = parsed;
  }

  if (!Array.isArray(finalIdeas)) finalIdeas = [];

  const normalized = finalIdeas.map(raw => {
    if (typeof raw === 'string') {
      return {
        titulo: raw.substring(0, 120),
        score: null,
        justificativa: '',
        palavras_chave: [],
        concorrencia: ''
      };
    }

    const titulo = raw.titulo || raw.title || raw.name || raw.Titulo || '';
    let score = raw.score ?? raw.pontuacao ?? raw.Score ?? null;
    if (typeof score === 'string') {
      const n = Number(score.replace(/[^\d.-]/g, ''));
      score = Number.isFinite(n) ? n : null;
    }
    const justificativa = raw.justificativa || raw.justification || raw.reason || '';
    const palavras_chave = raw.palavras_chave || raw.keywords || raw.palavras || raw.tags || [];
    const concorrencia = (raw.concorrencia || raw.competition || '').toString();

    return {
      titulo: titulo || '',
      score: (typeof score === 'number' && !Number.isNaN(score)) ? Math.max(0, Math.min(100, Math.round(score))) : null,
      justificativa: justificativa || '',
      palavras_chave: Array.isArray(palavras_chave) ? palavras_chave : (typeof palavras_chave === 'string' ? palavras_chave.split(',').map(s => s.trim()) : []),
      concorrencia: concorrencia || ''
    };
  });

  return normalized.map(i => ({
    json: {
      ...i,
      nicho: nicheValue || items[0].json.niche || items[0].json.nicho || '',
      data_analise: dateValue || items[0].json.data_analise || items[0].json.data || new Date().toISOString().split('T')[0]
    }
  }));
} catch (err) {
  console.error('Erro inesperado no Parse LLM Output:', err.message);
  return [];
}
```
## 3. Final JSON Output
```javascript
const ideiasArray = items.map(item => {
  const { nicho, data_analise, ...restOfIdea } = item.json;
  return restOfIdea;
});
const finalNiche = items[0].json.nicho || 'Nicho Não Encontrado';
const today = items[0].json.data_analise || new Date().toISOString().split('T')[0];
const finalOutput = {
  nicho: finalNiche,
  data_analise: today,
  ideias: ideiasArray
};
return [{ json: finalOutput }];
```
## 4. Prepare Sheet
```javascript
const final = $json; 
const rows = final.ideias.map(idea => ({
  nicho: final.nicho,
  data_analise: final.data_analise,
  titulo: idea.titulo,
  score: idea.score,
  justificativa: idea.justificativa,
  palavras_chave: idea.palavras_chave.join(", "),
  concorrencia: idea.concorrencia
}));
return rows.map(r => ({ json: r }));
```
