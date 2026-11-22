/**
 * Testy oficjalnych druków ZUS: wstępne wypełnienie (potok 1), konwerter PDF → JSON i formuły sprawdzania (potok 2).
 * Uruchom: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculate } from "../src/services/engine";
import { DEFAULT_LEGAL_CONFIG_2026 as cfg } from "../src/models/legal-config";
import { familyByNo, FAMILY_COUNT } from "../src/data/families";
import { fillValues, type OfficialFormId } from "../src/data/official-forms";
import { fillOfficialPdfBytes } from "../src/lib/official-pdf";
import { pdfToJson } from "../src/services/forms/convert";
import { checkForm } from "../src/services/forms/check";
import { validateIdCard, validateNrb, validatePesel, validateRegon } from "../src/services/documents/identifiers";

const today = "2026-11-22";
const font = readFileSync("public/fonts/Lato_400Regular.ttf");
const ctx = (no: number) => {
  const input = { ...familyByNo(no, today).input, asOf: today };
  return { d: input, r: calculate(input, cfg), who: "matka" as const, today };
};

test("100 rodzin ma komplet danych do wniosków z poprawnymi sumami kontrolnymi", () => {
  for (let no = 1; no <= FAMILY_COUNT; no++) {
    const m = familyByNo(no, today).input.mother;
    assert.ok(m.address?.postalCode && m.address.city, `rodzina ${no}: adres`);
    assert.ok(validateNrb(m.bankAccount!).valid, `rodzina ${no}: NRB`);
    assert.ok(validateIdCard(m.idDocument!).valid, `rodzina ${no}: dowód`);
    if (m.payer) assert.ok(validateRegon(m.payer.regon!).valid, `rodzina ${no}: REGON`);
    for (const k of familyByNo(no, today).input.child.kids ?? []) if (k.pesel) assert.ok(validatePesel(k.pesel).valid, `rodzina ${no}: PESEL dziecka`);
  }
});

test("wstępnie wypełnione druki przechodzą formuły sprawdzania bez błędów (wszystkie rodziny)", () => {
  const forms: OfficialFormId[] = ["ZAM", "ZAS-53", "Z-12", "ZCNA", "Z-3", "Z-3a", "ZUA"];
  for (let no = 1; no <= FAMILY_COUNT; no++)
    for (const form of forms) {
      const res = checkForm(form, fillValues(form, ctx(no)));
      assert.deepEqual(res.errors, [], `rodzina ${no}, ${form}`);
    }
});

test("ZAM: wypełnienie → PDF → konwerter JSON zwraca te same dane", async () => {
  const c = ctx(42);
  const values = fillValues("ZAM", c);
  const pdf = await fillOfficialPdfBytes(readFileSync("public/formularze/ZAM.pdf"), font, values);
  const json = await pdfToJson(pdf);
  assert.equal(json.form, "ZAM");
  assert.equal(json.document.insured.pesel, c.d.mother.pesel);
  assert.equal(json.document.bankAccount, c.d.mother.bankAccount);
  assert.equal(json.fields.find((f) => f.name === "Page1.Nazwisko")?.value, c.d.mother.lastName.toLocaleUpperCase("pl-PL"));
});

test("formuły sprawdzania wykrywają wykluczające się zaznaczenia, błędne sumy kontrolne i brakujące okresy", () => {
  const values = { ...fillValues("ZAM", ctx(42)), "Page5.TAK": true, "Page5.NIE": true, "Page1.PESEL": "12345678901", "Page2.Numerrachunku": "12345678901234567890123456", "Page2.ojcowskiego": true, "Page2.Okres4": "" };
  const res = checkForm("ZAM", values);
  assert.equal(res.ok, false);
  const rules = new Set(res.errors.map((e) => e.rule));
  assert.ok(rules.has("wykluczajace"), "TAK i NIE");
  assert.ok(rules.has("suma-kontrolna"), "PESEL / NRB");
  assert.ok(rules.has("zaleznosc"), "urlop ojcowski bez okresu");
});
