import logo from "@/data/campaign-logo.json";

export function CampaignLogo() {
   return <img className="campaign-brand-logo" src={logo.dataUrl} width={logo.width} height={logo.height} alt="Grupo Anchieta" />;
}
