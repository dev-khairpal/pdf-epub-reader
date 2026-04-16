// Electron webview tag type declaration
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        style?: React.CSSProperties;
        preload?: string;
        partition?: string;
        allowpopups?: string;
      },
      HTMLElement
    >;
  }
}
