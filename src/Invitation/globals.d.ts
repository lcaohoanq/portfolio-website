declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;
declare const __GALLERY_IMAGES__: { file: string; previews: { src: string; width: number }[] }[];
declare module '*.png' { const url: string; export default url; }
declare module '*.webp' {
    const url: string;
    export default url;
}
