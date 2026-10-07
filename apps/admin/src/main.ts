import "./app.css";
import { esc } from "./components/format";
import { ADMIN_DOMAIN, ADMIN_ROUTES } from "./pages/routes";
import "./boot";

document.documentElement.dataset.domain = ADMIN_DOMAIN;
document.documentElement.dataset.routes = String(ADMIN_ROUTES.length);
void esc;
