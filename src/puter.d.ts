declare global {
  interface Window {
    puter?: {
      ai?: {
        speech2txt: (
          input:
            | File
            | Blob
            | string
            | {
                file: File | Blob | string;
                language?: string;
                model?: string;
                response_format?: string;
              },
          options?: {
            language?: string;
            model?: string;
            response_format?: string;
          },
        ) => Promise<
          | string
          | {
              segments?: Array<{
                speaker?: string;
                text?: string;
              }>;
              text?: string;
            }
        >;
      };
    };
  }
}

export {};
