declare module "pdfkit" {
  import { Buffer } from "node";

  export default class Default {
    constructor(options?: { autoFirstPage?: boolean; size?: [number, number]; margin?: number; });
    end(): Promise<this>;
    end(): this;
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    text(text: string, options?: { underline?: boolean; }): this;
    fontSize(size: number): this;
    ln(): this;
  }
}