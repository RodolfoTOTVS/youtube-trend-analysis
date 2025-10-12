const n_vpd = pct(arr_vpd, r.views_per_day);
const n_lv = pct(arr_lv, r.log_views);
const n_eng = pct(arr_eng, r.engagement_rate);
const n_like = pct(arr_like, r.like_rate);
const n_subs = pct(arr_subs, r.channelSubs);
const n_comp = 1 - (r.channelSubs >= bigThreshold ? 1 : 0);

let rawScore = n_vpd*0.3 + n_lv*0.2 + n_eng*0.2 + n_like*0.1 + n_subs*0.1 + n_comp*0.1;
let computed = Math.round(rawScore * 100);

