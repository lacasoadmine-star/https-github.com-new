import "./app.css";
import { esc } from "./components/format";
import { PLAYER_DOMAIN, PLAYER_ROUTES } from "./pages/routes";
import "./boot";

document.documentElement.dataset.domain = PLAYER_DOMAIN;
document.documentElement.dataset.routes = String(PLAYER_ROUTES.length);
void esc;
