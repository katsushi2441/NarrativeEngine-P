import type { LocalePack } from '../types';

/**
 * Japanese.
 *
 * Translated for the Kurage Game Master deployment, where the GM narrates in
 * Japanese. Note that this pack only changes the UI chrome — the language the
 * model narrates in is `settings.narrationLanguage`, deliberately separate so a
 * player can read a Japanese UI while playing an English campaign, or vice
 * versa.
 *
 * Terminology follows Japanese TTRPG usage rather than literal translation:
 * "Game Master" is ゲームマスター (GM), "campaign" is キャンペーン, "lore" is
 * 世界設定. Product surfaces (Narrative Engine / Narrative Nexus) are kept in
 * Latin script — they are names, not words.
 */
export const ja: LocalePack = {
    code: 'ja',
    label: '日本語',

    /**
     * Japanese has no letter case, so `uppercase` on chrome labels does nothing,
     * and wide letter-spacing makes kana and kanji read as broken. Both are
     * cancelled here rather than in any component (same reasoning as ko).
     */
    styleProfile: {
        caps: 'flat',
        tracking: 'tight',
    },

    strings: {

        // ── Header ───────────────────────────────────────────────────────────
        'header.drawer.open': 'コンテキストパネルを開く',
        'header.drawer.close': 'コンテキストパネルを閉じる',
        'header.title': 'ナラティブエンジン',
        'header.version.tooltip': 'ナラティブエンジン バージョン {{version}}',
        'header.backup.tooltip': 'バックアップを作成',
        'header.backup.aria': 'バックアップを作成',
        'header.backup.label': 'バックアップ',
        'header.backup.toast.noChanges': '前回のバックアップから変更はありません',
        'header.backup.toast.created': 'バックアップを作成しました',
        'header.backup.toast.failed': 'バックアップの作成に失敗しました',
        'header.backups.tooltip': 'バックアップ管理',
        'header.backups.aria': 'バックアップ管理を開く',
        'header.backups.label': 'バックアップ管理',
        'header.character.tooltip': 'キャラクター',
        'header.character.aria': 'キャラクターパネルを開く',
        'header.character.label': 'キャラクター',
        'header.npcLedger.tooltip': 'NPC台帳',
        'header.npcLedger.aria': 'NPC台帳を開く',
        'header.npcLedger.label': 'NPC台帳',
        'header.enemyCompendium.tooltip': '敵図鑑 — スキャナー{{state}}',
        'header.enemyCompendium.aria': '敵図鑑を開く — スキャナー{{state}}',
        'header.enemyCompendium.label': '敵: {{state}}',
        'header.enemyCompendium.state.on': 'オン',
        'header.enemyCompendium.state.off': 'オフ',
        'header.places.tooltip': '場所台帳',
        'header.places.aria': '場所台帳を開く',
        'header.places.label': '場所',
        'header.aiTier.tooltip': 'AIティア: {{tier}}（クリックで Lite → Pro → Max と切替）',
        'header.aiTier.aria': 'AIティア: {{tier}}、クリックで切替',
        'header.pinned.tooltip': 'ピン留めした記憶',
        'header.pinned.aria': 'ピン留めした記憶を開く',
        'header.pinned.label': 'ピン留め',
        'header.settings.tooltip': '設定',
        'header.settings.aria': '設定を開く',
        'header.settings.label': '設定',
        'header.exit.tooltip': 'キャンペーンを終了',
        'header.exit.aria': 'キャンペーンを終了',
        'header.exit.label': '終了',

        // ── Settings modal (shell) ───────────────────────────────────────────
        'settings.dialog.aria': '設定',
        'settings.title': '⚙ 設定',
        'settings.version.tooltip': 'インストール済みのナラティブエンジンのバージョン',
        'settings.close.aria': '設定を閉じる',
        'settings.tab.providers': 'AIモデル',
        'settings.tab.presets': 'プリセット',
        'settings.tab.global': '全体設定',
        'settings.tab.advanced': '詳細設定',
        'settings.tab.debug': 'デバッグ',
        'settings.tab.extensions': '拡張',

        // ── Settings → Language ──────────────────────────────────────────────
        'settings.language.label': '表示言語',
        'settings.language.help': 'メニューとボタンの言語だけが変わります。未翻訳の項目は英語のまま表示されます。',
        'settings.language.contribute': 'あなたの言語がありませんか？ docs/TRANSLATING.md をご覧ください。ファイル1つだけで、他のツールは要りません。',
        'settings.language.pseudoWarning': 'レイアウト確認専用で、実在の言語ではありません。ボタンからはみ出す文字を見つけるために使います。',
        'settings.language.complete': '翻訳は完了しています。',
        // Japanese has no grammatical plural, so one/other share the same text.
        // `.other` alone would suffice; both are defined to keep the shape
        // obvious to the next translator.
        'settings.language.untranslated.one': '{{count}}件が英語のまま表示されます。',
        'settings.language.untranslated.other': '{{count}}件が英語のまま表示されます。',

        // ── Settings → Extensions ────────────────────────────────────────────
        'settings.extensions.title': '拡張',
        'settings.extensions.scope': 'モジュールをオフにすると、保存済みのものも含めてすべてのキャンペーンに適用されます。',
        'settings.extensions.reset': 'リセット',
        'settings.extensions.toggle.aria': '{{name}}を有効にする',
        'settings.extensions.mod.meta': 'v{{version}} · {{file}}',
        'settings.extensions.builtin.title': '組み込み',
        'settings.extensions.builtin.help': 'エンジン自身が各プロンプトへ加える内容です。オフにするとその分がプロンプトから外れます。',
        'settings.extensions.mods.title': '導入済みのMod',
        'settings.extensions.mods.help': 'Modファイルはアプリ直下の mods フォルダから読み込まれます。ファイルを入れて再スキャンしてください。',
        'settings.extensions.mods.rescan': '再スキャン',
        'settings.extensions.mods.loading': 'modsフォルダを読み込んでいます…',
        'settings.extensions.mods.error': 'サーバーに接続できず、Modの一覧を取得できませんでした。プレイには影響しません。',
        'settings.extensions.mods.empty': 'Modは導入されていません。mods フォルダに .mod.json を置いてから再スキャンしてください。',
        'settings.extensions.guide.show': 'Modの作り方を見る',
        'settings.extensions.guide.hide': 'ガイドを閉じる',
        'settings.extensions.guide.path': 'アプリフォルダ内の {{path}} でも全文を読めます。',
        'settings.extensions.faults.title': '読み込めなかったファイル',
        'settings.extensions.faults.help': 'これらは読み込まれていないため、プレイには影響しません。原因を直して再スキャンしてください。',

        // ── Campaign hub ─────────────────────────────────────────────────────
        'hub.import.tooltip': 'キャンペーンを読み込む',
        'hub.settings.tooltip': '設定',
        'hub.worldLore.tooltip': '世界設定を作成',
        'hub.tagline': 'AIゲームマスターシステム',
        // hub.brand.lead / hub.brand.accent are deliberately absent: the product
        // wordmark ("Narrative Nexus") is a name, so it stays in Latin script and
        // falls back to English. Translating it would rename the product.
        'hub.subtitle': '世界を選び、その運命を描く。',
        'hub.delete.confirm': 'このキャンペーンを削除しますか？ 会話履歴・世界設定・セーブを含むすべてのデータが失われます。',
        'hub.delete.cancel': 'キャンセル',
        'hub.delete.confirmAction': '削除',
        'hub.export.failed': '書き出しに失敗しました',
        'hub.import.success': '「{{name}}」を読み込みました — 検索インデックスをバックグラウンドで再構築しています',
        'hub.import.failed': '読み込みに失敗しました — キャンペーンファイルが不正です',
    },
};
