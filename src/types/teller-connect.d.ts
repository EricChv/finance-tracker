// teller.d.ts
export {};

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: TellerConfig) => TellerInstance;
    };
  }
}

interface TellerConfig {
  applicationId: string;
  products: string[];
  onSuccess: (enrollment: { accessToken: string; user: any }) => void;
  onInit?: () => void;
  onExit?: () => void;
}

interface TellerInstance {
  open: () => void;
  destroy: () => void;
}