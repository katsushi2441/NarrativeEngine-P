import fs from 'fs';
import path from 'path';
import { CAMPAIGNS_DIR, writeJson } from './fileStore.js';

/**
 * Starter campaign auto-seed (kgm fork).
 *
 * A brand-new player should log in and PLAY — not fill in a campaign title,
 * upload a cover image, and paste world lore before anything happens. When a
 * namespace (a tenant, or the owner's legacy space) has no campaigns at all,
 * the campaign-list route seeds this ready-to-play Japanese adventure: world
 * lore, an opening scene already on screen, and a cover image. The player
 * clicks the card and types their first action.
 *
 * Only the fields that differ from the client's DEFAULT_CONTEXT are written —
 * the hydrator merges stored context over defaults, so everything omitted here
 * picks up the engine's standard config.
 */

const STARTER_ID = 'hajimari-no-yado';
const STARTER_NAME = '霧の宿場町 — はじまりの夜';

// Simple self-contained SVG cover (no binary assets to ship).
const COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#1b2a4a"/><stop offset=".65" stop-color="#3d2b52"/><stop offset="1" stop-color="#0d0f1a"/>
</linearGradient></defs>
<rect width="640" height="360" fill="url(#g)"/>
<circle cx="520" cy="70" r="34" fill="#e8e3c9" opacity=".85"/>
<rect x="60" y="220" width="90" height="80" fill="#0a0c14"/>
<polygon points="45,220 105,175 165,220" fill="#0a0c14"/>
<rect x="88" y="258" width="18" height="42" fill="#d9a441" opacity=".9"/>
<rect x="0" y="300" width="640" height="60" fill="#05060a"/>
<text x="320" y="338" font-family="serif" font-size="26" fill="#e8e3c9" text-anchor="middle">霧の宿場町 — はじまりの夜</text>
</svg>`;

const COVER_DATA_URL = 'data:image/svg+xml;base64,' + Buffer.from(COVER_SVG, 'utf-8').toString('base64');

const LORE = `【舞台】霧渡(きりわたり)の宿場町。山あいの街道沿いにある小さな宿場町で、夜になると深い霧に包まれる。
【宿】「灯火屋(ともしびや)」。女将はお紺(おこん)。40代、面倒見がよいが、山の話になると口が重くなる。
【住人】行商人の六兵衛(ろくべえ)。何でも売るが、値段より「物語」で支払わせたがる変わり者。
【神社】町外れの杉森神社。宮司は不在で、社は荒れている。狛犬の片方が最近割れた。
【噂】この一月で、山道を越えようとした旅人が三人、霧の夜に消えた。荷物だけが街道に残されていた。
【決まりごと】霧の濃い夜は、灯りを持たずに外へ出てはならない——町の者は皆そう言うが、理由を尋ねると話を逸らす。`;

const OPENING = `旅の途中、あなたは日暮れとともに山あいの宿場町「霧渡」へたどり着いた。石畳は湿り、軒先の提灯がひとつ、またひとつと灯っていく。

宿「灯火屋」の戸を開けると、囲炉裏の火がぱちりと爆ぜた。女将のお紺が顔を上げる。
「おや、旅の方かい。……今夜は霧が濃くなるよ。悪いことは言わない、今日はもう外に出なさんな」

土間の隅では、行商人の六兵衛が荷を広げ、にやにやとこちらを見ている。窓の外、街道の先はもう白い霧に呑まれ始めていた。

さて、どうする？　たとえば——
・お紺に「霧の夜に何があるのか」と尋ねる
・六兵衛の荷を覗いてみる
・忠告を無視して、霧の街道へ出てみる

もちろん、思いついたことを自由に書いていい。`;

export function seedStarterCampaign(prefix = '') {
    const id = prefix + STARTER_ID;
    const metaPath = path.join(CAMPAIGNS_DIR, `${id}.json`);
    if (fs.existsSync(metaPath)) return null;

    const now = Date.now();
    writeJson(metaPath, {
        id,
        name: STARTER_NAME,
        coverImage: COVER_DATA_URL,
        createdAt: now,
        lastPlayedAt: now,
    });
    writeJson(path.join(CAMPAIGNS_DIR, `${id}.state.json`), {
        context: {
            loreRaw: LORE,
            worldVibe: '和風ダークファンタジー。静かな不気味さと人情。霧・提灯・囲炉裏。派手な戦闘より、探索と会話と選択の重さ。',
        },
        messages: [
            {
                id: `starter-opening-${now}`,
                role: 'assistant',
                content: OPENING,
                timestamp: now,
            },
        ],
        condenser: { condensedUpToIndex: -1 },
        pinnedExcerpts: [],
    });
    console.log(`[Starter] Seeded starter campaign: ${id}`);
    return id;
}
