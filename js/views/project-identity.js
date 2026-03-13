import { store } from "../store.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";

export function renderProjectIdentity(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Fiche d'identité",
    variant: "identity"
  });

  const form = store.projectForm;

  root.innerHTML = `
    <section class="project-simple-page">
      <div class="project-simple-scroll" id="projectIdentityScroll">
        <div class="identity-page">
          <h2>Fiche d'identité</h2>

          <div class="identity-form">
            <div class="form-row">
              <label>Commune / Code postal</label>
              <input id="communeCp" type="text" value="${form.communeCp || ""}">
            </div>

            <div class="form-row">
              <label>Classe d'importance</label>
              <select id="importance">
                <option value="I" ${form.importance === "I" ? "selected" : ""}>I</option>
                <option value="II" ${form.importance === "II" ? "selected" : ""}>II</option>
                <option value="III" ${form.importance === "III" ? "selected" : ""}>III</option>
                <option value="IV" ${form.importance === "IV" ? "selected" : ""}>IV</option>
              </select>
            </div>

            <div class="form-row">
              <label>Classe de sol</label>
              <select id="soilClass">
                <option value="A" ${form.soilClass === "A" ? "selected" : ""}>A</option>
                <option value="B" ${form.soilClass === "B" ? "selected" : ""}>B</option>
                <option value="C" ${form.soilClass === "C" ? "selected" : ""}>C</option>
                <option value="D" ${form.soilClass === "D" ? "selected" : ""}>D</option>
                <option value="E" ${form.soilClass === "E" ? "selected" : ""}>E</option>
              </select>
            </div>

            <div class="form-row">
              <label>Liquéfaction</label>
              <select id="liquefaction">
                <option value="no" ${form.liquefaction === "no" ? "selected" : ""}>Non</option>
                <option value="possible" ${form.liquefaction === "possible" ? "selected" : ""}>Possible</option>
                <option value="yes" ${form.liquefaction === "yes" ? "selected" : ""}>Oui</option>
              </select>
            </div>

            <div class="form-row">
              <label>Référentiel</label>
              <select id="referential">
                <option value="EC8" ${form.referential === "EC8" ? "selected" : ""}>Eurocode 8</option>
                <option value="PS92" ${form.referential === "PS92" ? "selected" : ""}>PS92</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectIdentityScroll"));
  bindIdentityEvents();
}

function bindIdentityEvents() {
  const communeCp = document.getElementById("communeCp");
  const importance = document.getElementById("importance");
  const soilClass = document.getElementById("soilClass");
  const liquefaction = document.getElementById("liquefaction");
  const referential = document.getElementById("referential");

  if (communeCp) {
    communeCp.addEventListener("input", (e) => {
      store.projectForm.communeCp = e.target.value;
    });
  }

  if (importance) {
    importance.addEventListener("change", (e) => {
      store.projectForm.importance = e.target.value;
    });
  }

  if (soilClass) {
    soilClass.addEventListener("change", (e) => {
      store.projectForm.soilClass = e.target.value;
    });
  }

  if (liquefaction) {
    liquefaction.addEventListener("change", (e) => {
      store.projectForm.liquefaction = e.target.value;
    });
  }

  if (referential) {
    referential.addEventListener("change", (e) => {
      store.projectForm.referential = e.target.value;
    });
  }
}
