declare module 'html-to-docx' {
  interface DocumentOptions {
    table?: { row?: { cantSplit?: boolean } };
    footer?: boolean;
    pageNumber?: boolean;
  }

  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: DocumentOptions,
    footerHTMLString?: string | null,
  ): Promise<Buffer | Blob | ArrayBuffer>;

  export default HTMLtoDOCX;
}
