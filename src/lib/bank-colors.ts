// Bank branding mapping - colors and logos
export const bankBranding: Record<
  string,
  { color: string; logo: string }
> = {
  chase: {
    color: "bg-[#117DBA]", // Chase Blue
    logo: "https://www.chase.com/favicon.ico",
  },
  bofa: {
    color: "bg-[#C41E3A]", // Bank of America Red
    logo: "https://www.bankofamerica.com/favicon.ico",
  },
  "bank_of_america": {
    color: "bg-[#C41E3A]",
    logo: "https://www.bankofamerica.com/favicon.ico",
  },
  wellsfargo: {
    color: "bg-[#C60C30]", // Wells Fargo Red
    logo: "https://www.wellsfargo.com/favicon.ico",
  },
  "wells_fargo": {
    color: "bg-[#C60C30]",
    logo: "https://www.wellsfargo.com/favicon.ico",
  },
  citi: {
    color: "bg-[#1E90FF]", // Citi Blue
    logo: "https://www.citi.com/favicon.ico",
  },
  capital_one: {
    color: "bg-[#E31937]", // Capital One Red
    logo: "https://www.capitalone.com/favicon.ico",
  },
  amex: {
    color: "bg-[#006FCF]", // American Express Blue
    logo: "https://www.americanexpress.com/favicon.ico",
  },
  "american_express": {
    color: "bg-[#006FCF]",
    logo: "https://www.americanexpress.com/favicon.ico",
  },
  discover: {
    color: "bg-[#FF6000]", // Discover Orange
    logo: "https://www.discover.com/favicon.ico",
  },
  usbank: {
    color: "bg-[#003478]", // US Bank Navy
    logo: "https://www.usbank.com/favicon.ico",
  },
  "us_bank": {
    color: "bg-[#003478]",
    logo: "https://www.usbank.com/favicon.ico",
  },
}

export function getBankBranding(
  institutionName: string | undefined
): { color: string; logo: string } {
  if (!institutionName) {
    return {
      color: "bg-[#6D8299]",
      logo: "https://logo.clearbit.com/bank.com",
    }
  }

  const normalized = institutionName.toLowerCase().replace(/\s+/g, "_")
  return (
    bankBranding[normalized] ||
    bankBranding[institutionName.toLowerCase()] || {
      color: "bg-[#6D8299]",
      logo: "https://logo.clearbit.com/bank.com",
    }
  )
}
