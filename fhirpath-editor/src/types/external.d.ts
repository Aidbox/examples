declare module 'lezer-fhirpath' {
  import { Tree } from '@lezer/common';
  
  export const parser: {
    parse: (input: string) => Tree;
  };
}

declare module '@lhncbc/ucum-lhc' {
  export class UcumLhcUtils {
    static getInstance(): UcumLhcUtils;
  }

  export class UnitTables {
    static getInstance(): UnitTables;
    unitCodes_: Record<string, UnitCode>;
  }

  export interface UnitCode {
    csCode_: string;
    property_: string;
    name_: string;
  }
} 