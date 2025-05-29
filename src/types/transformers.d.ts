declare module '@xenova/transformers' {
  export interface PipelineOptions {
    pooling?: 'mean' | 'max' | 'cls';
    normalize?: boolean;
  }

  export interface EmbedderOutput {
    data: Float32Array;
  }

  export type PipelineFunction = (
    task: string,
    model: string,
    options?: PipelineOptions
  ) => Promise<(text: string, options?: PipelineOptions) => Promise<EmbedderOutput>>;

  export const pipeline: PipelineFunction;
} 