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
import { OFFICIAL_FIELDS, OFFICIAL_FORMS, blankValue, fillValues, sameFieldValue, type OfficialFormId } from "../src/data/official-forms";
import { fillOfficialPdfBytes, readAcroForm } from "../src/lib/official-pdf";
import { reviewOfficialForm } from "../src/services/forms/review";
import { evaluateDocument, fillDocFromProfile, matchProfile } from "../src/services/documents/evaluate";
import { buildForms } from "../src/components/forms/form-catalog";
import { parseDocumentText } from "../src/services/documents/parse";
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

test("Moje sprawy → pobrany wniosek → Sprawdź dokument: bez błędów, zgodny z aplikacją, ten sam werdykt (co 7. rodzina)", async () => {
  for (let no = 1; no <= FAMILY_COUNT; no += 7) {
    const fam = familyByNo(no, today);
    const r = calculate({ ...fam.input, asOf: today }, cfg);
    for (const f of buildForms(fam.input, r).filter((x) => x.official && x.relevant)) {
      const form = f.official!;
      const who = f.id === "zam-tata" ? "ojciec" : f.id === "zcna" && (fam.input.father?.payer || fam.input.father?.business) ? "ojciec" : "matka";
      const values = Object.fromEntries(f.fields.map((x) => [x.key, x.value]));
      const actual = await readAcroForm(await fillOfficialPdfBytes(readFileSync(`public/formularze/${OFFICIAL_FORMS[form].file}`), font, values));
      const review = reviewOfficialForm(form, actual);
      // przed porodem ZCNA ma tylko uwagę „złożysz po nadaniu PESEL”
      assert.deepEqual(review.issues.filter((i) => i.severity === "error").map((i) => i.message), [], `rodzina ${no}, ${f.id}: błędy`);
      // porównanie pole po polu z drukiem z danych aplikacji
      const expected = fillValues(form, { d: fam.input, r, who, today });
      for (const d of OFFICIAL_FIELDS[form]!.filter((x) => !x.name.startsWith("@") && x.read !== "signDate" && !x.today))
        assert.ok(sameFieldValue(d, actual[d.name], expected[d.name]) || (blankValue(actual[d.name]) && blankValue(expected[d.name])), `rodzina ${no}, ${f.id}: ${d.name}`);
      if (form === "Z-12") continue;
      assert.equal(matchProfile(review.document, fam.input), who, `rodzina ${no}, ${f.id}: dopasowanie osoby`);
      if (["zam", "zam-tata", "z3", "z3a"].includes(f.id)) {
        const ev = evaluateDocument(fillDocFromProfile(review.document, fam.input, who).document, cfg, today, { profile: fam.input, who });
        const segs = r.segments.filter((s) => s.who === who && !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind));
        assert.ok(Math.abs(ev.verdict.total - segs.reduce((a, x) => a + x.total, 0)) < 1, `rodzina ${no}, ${f.id}: kwota jak w kalkulatorze`);
      }
    }
  }
});

test("Z-3: tabela wynagrodzeń, okres zatrudnienia, etat i liczba ubezpieczonych wracają z druku", async () => {
  const c = ctx(1);
  const actual = await readAcroForm(await fillOfficialPdfBytes(readFileSync("public/formularze/Z-3.pdf"), font, fillValues("Z-3", c)));
  const doc = reviewOfficialForm("Z-3", actual).document;
  const m = c.d.mother;
  assert.equal(doc.insuranceStart, m.insuranceStart);
  assert.equal(doc.workTimeFraction, m.workTimeFraction);
  assert.equal(doc.payer.insuredCount! > 20, (m.payer?.insuredCount ?? 0) > 20);
  assert.ok(doc.incomeMonths.length >= 1 && doc.incomeMonths.length <= 12);
});

test("wydruk pustego wzoru ZUS: parser tekstu nie bierze etykiet za dane", () => {
  const t = "WNIOSEK O ZASIŁEK MACIERZYŃSKI ZAM\nImię\nNazwisko\nUlica\nJeśli prowadzisz pozarolniczą działalność gospodarczą\nprzyjęciem dziecka na wychowanie\nZakład Ubezpieczeń Społecznych w internecie – www.zus.pl";
  const d = parseDocumentText(t);
  assert.equal(d.insured.firstName, null);
  assert.equal(d.title, null);
  assert.equal(d.child.adoption, null);
});
