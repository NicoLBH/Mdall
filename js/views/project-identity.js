export function renderProjectIdentity(root) {

root.innerHTML = `
<div class="identity-page">
 <h2>Fiche d'identité</h2>
 <div class="identity-form">
  <div class="form-row">
   <label>Commune / Code postal</label>
   <input id="communeCp" type="text">
  </div>
  <div class="form-row">
   <label>Classe d'importance</label>
   <select id="importance">
    <option value="I">I</option>
    <option value="II">II</option>
    <option value="III">III</option>
    <option value="IV">IV</option>
   </select>
  </div>
  <div class="form-row">
   <label>Classe de sol</label>
   <select id="soilClass">
    <option value="A">A</option>
    <option value="B">B</option>
    <option value="C">C</option>
    <option value="D">D</option>
    <option value="E">E</option>
   </select>
  </div>
  <div class="form-row">
   <label>Liquéfaction</label>
   <select id="liquefaction">
    <option value="no">Non</option>
    <option value="possible">Possible</option>
    <option value="yes">Oui</option>
   </select>
  </div>
  <div class="form-row">
   <label>Référentiel</label>
   <select id="referential">
    <option value="EC8">Eurocode 8</option>
    <option value="PS92">PS92</option>
   </select>
  </div>
 </div>
</div>
`;
}
