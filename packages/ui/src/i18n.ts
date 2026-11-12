// Minimal i18n: a dictionary lookup with English fallback. Demonstrates language switching and RTL (Arabic). Not a full translation of the app.
export type Lang = "en" | "es" | "ja" | "ar";
export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [{ code: "en", label: "English", dir: "ltr" }, { code: "es", label: "Español", dir: "ltr" }, { code: "ja", label: "日本語", dir: "ltr" }, { code: "ar", label: "العربية", dir: "rtl" }];
const D: Record<string, Partial<Record<Lang, string>>> = {
  Dashboards: { es: "Paneles", ja: "ダッシュボード", ar: "لوحات المعلومات" }, Data: { es: "Datos", ja: "データ", ar: "البيانات" }, Records: { es: "Registros", ja: "レコード", ar: "السجلات" }, Tools: { es: "Herramientas", ja: "ツール", ar: "الأدوات" },
  Warehouse: { es: "Almacén", ja: "倉庫", ar: "المستودع" }, Panels: { es: "Paneles", ja: "パネル", ar: "اللوحات" }, Library: { es: "Biblioteca", ja: "ライブラリ", ar: "المكتبة" },
  Overview: { es: "Resumen", ja: "概要", ar: "نظرة عامة" }, Analytics: { es: "Analítica", ja: "分析", ar: "التحليلات" }, "Operations wall": { es: "Muro de operaciones", ja: "運用ウォール", ar: "جدار العمليات" }, "Status page": { es: "Página de estado", ja: "ステータスページ", ar: "صفحة الحالة" },
  "Orders (data table)": { es: "Pedidos (tabla)", ja: "注文（テーブル）", ar: "الطلبات (جدول)" }, "Card grid": { es: "Cuadrícula de tarjetas", ja: "カードグリッド", ar: "شبكة البطاقات" }, "List view": { es: "Vista de lista", ja: "リスト表示", ar: "عرض القائمة" }, "Kanban board": { es: "Tablero Kanban", ja: "かんばんボード", ar: "لوحة كانبان" },
  Calendar: { es: "Calendario", ja: "カレンダー", ar: "التقويم" }, "Search results": { es: "Resultados", ja: "検索結果", ar: "نتائج البحث" }, Profile: { es: "Perfil", ja: "プロフィール", ar: "الملف الشخصي" }, Settings: { es: "Ajustes", ja: "設定", ar: "الإعدادات" },
  "Log viewer": { es: "Visor de registros", ja: "ログビューア", ar: "عارض السجلات" }, "Activity feed": { es: "Actividad", ja: "アクティビティ", ar: "النشاط" }, Notifications: { es: "Notificaciones", ja: "通知", ar: "الإشعارات" }, "Dock board": { es: "Panel de muelles", ja: "ドックボード", ar: "لوحة الأرصفة" },
  "Search or jump to…": { es: "Buscar o ir a…", ja: "検索 / 移動…", ar: "ابحث أو انتقل إلى…" }, "Sign out": { es: "Cerrar sesión", ja: "サインアウト", ar: "تسجيل الخروج" }, "Keyboard shortcuts": { es: "Atajos de teclado", ja: "キーボードショートカット", ar: "اختصارات لوحة المفاتيح" },
  Help: { es: "Ayuda", ja: "ヘルプ", ar: "مساعدة" }, "Help centre": { es: "Centro de ayuda", ja: "ヘルプセンター", ar: "مركز المساعدة" },
};
export const tr = (lang: Lang, s: string) => (lang === "en" ? s : D[s]?.[lang] ?? s);
