# 타입별 favorite 포켓몬 피커
<img width="2296" height="1534" alt="image" src="https://github.com/user-attachments/assets/c06a928e-29b3-4d9e-8fc6-1e71ab854e98" />
사라진 cpokemon.com 스타일의 "타입별 내가 좋아하는 포켓몬" 피커. 18개 타입 박스에서 셀렉트박스로 포켓몬을 고르면 공식 일러스트가 표시된다. 채운 결과를 캡처해 공유하는 용도.

## 사용법
https://parkbible.github.io/Pokemon-Type-Picker/ 에 접속.

포켓몬을 다 고른 뒤 우측 상단 **📷 이미지로 저장** 버튼을 누르면 `my-favorite-pokemon.png`로 저장된다. (저장 이미지에는 셀렉트박스가 빠지고 타입 박스 + 포켓몬만 깔끔하게 나옴. 폰에서 저장해도 항상 6열 와이드 비율 유지)

선택한 포켓몬은 브라우저 localStorage에 저장되어 **새로고침해도 유지**된다. **↺ 초기화** 버튼으로 전체 선택을 지울 수 있다.

## 구성
- `index.html` — UI (HTML+CSS+JS 인라인). `data.js`를 불러와 렌더링.
- `data.js` — 자동 생성된 타입별 포켓몬 데이터 (`window.POKEMON_DATA`).
- `generate-data.js` — PokéAPI에서 데이터를 받아 `data.js`를 만드는 스크립트.

## 데이터 재생성 (새 포켓몬 추가 시 등)
```
node generate-data.js
```
- [PokéAPI](https://pokeapi.co)에서 타입별 목록 + 한국어 이름을 받아온다.
- 이미지는 PokéAPI 공식 아트워크 원격 URL을 사용한다.
- 기준종 + 주요 대체폼(메가/거다이맥스/원시/리전폼)을 포함한다. 대체폼은 "이름 (폼)" 형태로 표시되며(예: `리자몽 (메가 X)`, `라이츄 (알로라)`), 폼의 실제 타입 박스에 들어간다.
- 그 외 잡다한 폼(피카츄 모자/코스프레, 크기 변화, 토템폼, 성별 차이 등)은 제외한다.
- PokéAPI에 2D 일러스트가 없는 폼은 `generate-data.js`의 `KO_OVERRIDE`/`EXTRA_ENTRIES`로 수동 보강한다. 이미지는 `img/` 폴더에 받아두고 로컬 경로로 참조(CORS·저장 문제 없음). 예: 트리토돈 동쪽바다(`img/gastrodon-east.png`).

## 데이터 출처
- 포켓몬 목록/이름/이미지: [PokéAPI](https://pokeapi.co) (CC-BY 계열, 비상업적 사용 권장)
