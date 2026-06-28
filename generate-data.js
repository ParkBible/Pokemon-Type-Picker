// 생성: node generate-data.js
// PokéAPI에서 타입별 포켓몬 목록 + 한국어 이름 + 공식 아트워크 URL을 받아 data.js를 만든다.
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
  // 1) 타입별 포켓몬 id 수집 (대체폼 id > 10000 제외)
  const typeToIds = {};
  const allIds = new Set();

  for (const type of TYPES) {
    const data = await fetchJson(`https://pokeapi.co/api/v2/type/${type}`);
    const ids = data.pokemon
      .map((p) => idFromUrl(p.pokemon.url))
      .filter((id) => Number.isFinite(id) && id <= 10000);
    typeToIds[type] = ids;
    ids.forEach((id) => allIds.add(id));
    console.log(`타입 수집: ${type.padEnd(9)} ${ids.length}마리`);
  }

  // 2) 고유 id별 한국어 이름 조회
  const uniqueIds = [...allIds].sort((a, b) => a - b);
  console.log(`\n고유 포켓몬 ${uniqueIds.length}마리 한국어 이름 조회 중...`);

  const idToName = {};
  let done = 0;
  await mapWithConcurrency(uniqueIds, 15, async (id) => {
    try {
      const sp = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const ko = sp.names.find((n) => n.language.name === "ko");
      const en = sp.names.find((n) => n.language.name === "en");
      idToName[id] = ko?.name || en?.name || `#${id}`;
    } catch {
      idToName[id] = `#${id}`;
    }
    done++;
    if (done % 100 === 0) console.log(`  ...${done}/${uniqueIds.length}`);
  });

  // 3) 타입별 객체 구성 + 한국어 이름 가나다순 정렬
  const result = {};
  for (const type of TYPES) {
    result[type] = typeToIds[type]
      .map((id) => ({ id, ko: idToName[id], img: ARTWORK(id) }))
      .sort((a, b) => a.ko.localeCompare(b.ko, "ko"));
  }

  // 4) data.js 작성
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
