// 생성: node generate-data.js
// PokéAPI에서 타입별 포켓몬 목록 + 한국어 이름 + 공식 아트워크 URL을 받아 data.js를 만든다.
// 기준종 + 주요 대체폼(메가/거다이맥스/원시/리전폼)을 포함한다.
// Node 18+ 내장 fetch 사용 (외부 의존성 없음).

const fs = require("fs");
const path = require("path");

// 사진과 동일한 표시 순서
const TYPES = [
  "grass", "fire", "water", "normal", "electric", "psychic",
  "fighting", "rock", "ground", "flying", "bug", "poison",
  "dark", "ghost", "ice", "steel", "dragon", "fairy",
];

const ARTWORK = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

// 슬러그로 "주요 대체폼" 여부 판별 → 한국어 폼 이름 반환 (아니면 null)
function classifyForm(slug) {
  if (slug.endsWith("-mega-x")) return "메가 X";
  if (slug.endsWith("-mega-y")) return "메가 Y";
  if (slug.endsWith("-mega-z")) return "메가 Z";
  if (slug.endsWith("-mega")) return "메가";
  if (slug.endsWith("-gmax")) return "거다이맥스";
  if (slug.endsWith("-primal")) return "원시";
  if (slug.includes("-paldea-combat")) return "팔데아 콤바트";
  if (slug.includes("-paldea-blaze")) return "팔데아 블레이즈";
  if (slug.includes("-paldea-aqua")) return "팔데아 아쿠아";
  if (slug.endsWith("-alola")) return "알로라";
  if (slug.endsWith("-galar")) return "가라르";
  if (slug.endsWith("-hisui")) return "히스이";
  if (slug.endsWith("-paldea")) return "팔데아";
  return null;
}

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// 동시 요청 수를 제한하면서 배치 처리
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

function idFromUrl(url) {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : NaN;
}

async function main() {
  // 1) 타입별 항목 수집 (기준종 id<=10000, 주요 폼 id>10000)
  const typeEntries = {}; // type -> [{ id, slug }]
  const baseIds = new Set();
  const formSlugs = new Map(); // formId -> slug

  for (const type of TYPES) {
    const data = await fetchJson(`https://pokeapi.co/api/v2/type/${type}`);
    const entries = data.pokemon
      .map((p) => ({ slug: p.pokemon.name, id: idFromUrl(p.pokemon.url) }))
      .filter((e) => Number.isFinite(e.id));
    typeEntries[type] = entries;

    let baseCount = 0, formCount = 0;
    for (const e of entries) {
      if (e.id <= 10000) { baseIds.add(e.id); baseCount++; }
      else if (classifyForm(e.slug)) { formSlugs.set(e.id, e.slug); formCount++; }
    }
    console.log(`타입 수집: ${type.padEnd(9)} 기준종 ${String(baseCount).padStart(3)} + 폼 ${formCount}`);
  }

  // 2) 기준종 한국어 이름 조회
  const uniqueBaseIds = [...baseIds].sort((a, b) => a - b);
  console.log(`\n기준종 ${uniqueBaseIds.length}마리 한국어 이름 조회 중...`);
  const idToName = {};
  let done = 0;
  await mapWithConcurrency(uniqueBaseIds, 15, async (id) => {
    try {
      const sp = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const ko = sp.names.find((n) => n.language.name === "ko");
      const en = sp.names.find((n) => n.language.name === "en");
      idToName[id] = ko?.name || en?.name || `#${id}`;
    } catch {
      idToName[id] = `#${id}`;
    }
    if (++done % 100 === 0) console.log(`  ...${done}/${uniqueBaseIds.length}`);
  });

  // 3) 주요 폼 조회 — /pokemon/{id} 에서 기준종 id + 아트워크 URL 획득
  const formIds = [...formSlugs.keys()];
  console.log(`\n주요 대체폼 ${formIds.length}개 조회 중...`);
  const formData = {}; // formId -> { ko, img }
  await mapWithConcurrency(formIds, 15, async (id) => {
    try {
      const slug = formSlugs.get(id);
      const pj = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const speciesId = idFromUrl(pj.species.url);
      let baseKo = idToName[speciesId];
      if (!baseKo) {
        const sp = await fetchJson(pj.species.url);
        baseKo = sp.names.find((n) => n.language.name === "ko")?.name
          || sp.names.find((n) => n.language.name === "en")?.name
          || `#${speciesId}`;
      }
      const art = pj.sprites?.other?.["official-artwork"]?.front_default || ARTWORK(id);
      formData[id] = { ko: `${baseKo} (${classifyForm(slug)})`, img: art };
    } catch {
      // 폼 조회 실패 시 건너뜀
    }
  });

  // 4) 타입별 객체 구성 (기준종 + 폼) + 한국어 이름 가나다순 정렬
  const result = {};
  for (const type of TYPES) {
    const arr = [];
    for (const e of typeEntries[type]) {
      if (e.id <= 10000 && idToName[e.id]) {
        arr.push({ id: e.id, ko: idToName[e.id], img: ARTWORK(e.id) });
      } else if (formData[e.id]) {
        arr.push({ id: e.id, ko: formData[e.id].ko, img: formData[e.id].img });
      }
    }
    arr.sort((a, b) => a.ko.localeCompare(b.ko, "ko"));
    result[type] = arr;
  }

  // 5) data.js 작성
  const out =
    "// 자동 생성 파일 — 직접 수정하지 말고 `node generate-data.js`로 재생성하세요.\n" +
    "window.POKEMON_DATA = " +
    JSON.stringify(result, null, 0) +
    ";\n";
  fs.writeFileSync(path.join(__dirname, "data.js"), out, "utf8");

  console.log("\n완료! data.js 생성됨.");
  for (const type of TYPES) console.log(`  ${type.padEnd(9)} ${result[type].length}마리`);
}

main().catch((err) => {
  console.error("실패:", err);
  process.exit(1);
});
