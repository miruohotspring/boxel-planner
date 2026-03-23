export const CURRENT_VERSION = "1.0" as const;
export const SUPPORTED_VERSIONS = ["1.0"] as const;
export type SupportedVersion = (typeof SUPPORTED_VERSIONS)[number];
