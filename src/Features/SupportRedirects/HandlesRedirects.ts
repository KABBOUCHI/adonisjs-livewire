import { BaseComponent } from "../../BaseComponent";
import { store } from "../../store";

export class HandlesRedirects extends BaseComponent {
  public redirect(url: string, navigate: boolean = false) {
    store(this).push('redirect', url);

    if (navigate) store(this).push('redirectUsingNavigate', true);
  }
}
