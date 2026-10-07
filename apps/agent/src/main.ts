import "./app.css";
import { esc } from "./components/format";
import { AGENT_DOMAIN, AGENT_ROUTES } from "./pages/routes";
import "./boot";

document.documentElement.dataset.domain = AGENT_DOMAIN;
document.documentElement.dataset.routes = String(AGENT_ROUTES.length);
void esc;
