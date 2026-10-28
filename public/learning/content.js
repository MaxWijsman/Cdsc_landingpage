((Q) => {
  "use strict";
  const choice = (id, label, quality) => ({ id, label, quality });
  const ingredients = (task, context, audience, constraint) => ({
    task: [choice("task-good", task, "good"), choice("task-weak", "Schrijf iets over het verzoek", "weak"), choice("task-unsafe", "Beloof wat nodig is om het probleem op te lossen", "unsafe")],
    context: [choice("context-good", context, "good"), choice("context-weak", "Voeg ongerelateerde bedrijfsgeschiedenis toe", "weak"), choice("context-none", "Laat de achtergrond weg", "weak")],
    audience: [choice("audience-good", audience, "good"), choice("audience-weak", "Schrijf voor een willekeurige lezer", "weak"), choice("audience-wrong", "Schrijf als een informeel bericht op sociale media", "weak")],
    tone: [choice("tone-good", "Professioneel, vriendelijk en respectvol", "good"), choice("tone-weak", "Wees bot en confronterend", "weak"), choice("tone-vague", "Kies zelf een toon", "weak")],
    constraints: [choice("constraints-good", constraint, "good"), choice("constraints-weak", "Controleer niet welke toezeggingen zijn toegestaan", "weak"), choice("constraints-unsafe", "Verzin een regel of deadline om zeker over te komen", "unsafe")],
    format: [choice("format-good", "Korte e-mail met een onderwerpregel", "good"), choice("format-weak", "Een lang betoog", "weak"), choice("format-vague", "Geen vorm voor het antwoord opgegeven", "weak")],
  });
  const inbox = [
    {
      id: "discount", title: "Een lastig kortingsverzoek", brief: "Een fictieve klant vraagt 40% korting. Je mag die niet toezeggen. Schrijf een respectvol antwoord dat de relatie goed houdt.",
      ingredients: ingredients("Wijs het verzoek om 40% korting af", "Behoud een goede relatie met de klant", "Een bestaande zakelijke klant", "Beloof geen korting zonder toestemming"),
      subject: "Uw kortingsverzoek", greeting: "Beste Rowan,", goodBody: "Bedankt voor uw verzoek. Wij kunnen de gevraagde korting van 40% niet aanbieden.", positive: "Wij waarderen onze samenwerking en bespreken graag welke andere mogelijkheden zijn toegestaan.", unsafe: "Wij kunnen uw korting van 40% direct goedkeuren.", invented: "Volgens ons bedrijfsbeleid krijgen alle bestaande klanten gegarandeerd 40% korting.",
    },
    {
      id: "delay", title: "Een project loopt vertraging op", brief: "Een fictief project loopt vertraging op door een leverancier. Een nieuwe opleverdatum is nog niet bevestigd. Informeer je collega's zonder een deadline te verzinnen.",
      ingredients: ingredients("Leg de vertraging en de volgende stap uit", "Vertraging bij de leverancier; een nieuwe datum is niet bevestigd", "Collega's die op het project wachten", "Verzin geen deadline en doe geen nieuwe toezeggingen"),
      subject: "Update over de oplevering", greeting: "Beste collega's,", goodBody: "Ons project loopt vertraging op door een leverancier. Er is nog geen bevestigde opleverdatum.", positive: "Zodra de leverancier de planning bevestigt, delen we een update. Bedankt voor jullie geduld.", unsafe: "De oplevering is gegarandeerd voor vrijdag, ook al heeft de leverancier dit niet bevestigd.", invented: "Ons beleid garandeert dat vertraging bij leveranciers nooit invloed heeft op de opleverdatum.",
    },
  ];
  const delegation = [
    { id: "titles", task: "Bedenk vijf titels voor een interne presentatie.", context: "Je hebt alleen openbare informatie over het onderwerp nodig. Gebruik een goedgekeurd hulpmiddel.", answer: "help", why: "AI kan helpen ideeën te bedenken voor taken met weinig risico. Jij kiest welke ideeën je gebruikt." },
    { id: "notes", task: "Vat niet-gevoelige vergadernotities samen.", context: "Het gekozen zakelijke AI-hulpmiddel is goedgekeurd voor deze notities.", answer: "help", why: "AI kan toegestane informatie ordenen. Controleer of de samenvatting klopt met je notities." },
    { id: "outline", task: "Stel verbeteringen voor aan de opzet van een presentatie.", context: "De opzet bevat openbare, niet-gevoelige informatie.", answer: "help", why: "AI kan structuur en alternatieven voorstellen. Jij bepaalt wat je overneemt." },
    { id: "hiring", task: "Neem de definitieve aanstellingsbeslissing tussen twee kandidaten.", context: "Het gaat om de aanstellingsbeslissing zelf, niet om het opstellen van sollicitatievragen.", answer: "human", critical: true, why: "De verantwoordelijke mensen binnen het aanstellingsproces moeten de definitieve beslissing nemen." },
    { id: "contract", task: "Doe een juridisch bindende contractuele toezegging.", context: "Deze taak gaat om het aangaan van de verplichting, niet alleen om het schrijven van de tekst.", answer: "human", critical: true, why: "Een bevoegd persoon moet de toezegging doen. AI heeft die bevoegdheid niet." },
    { id: "customer", task: "Schrijf een conceptantwoord aan een ontevreden klant.", context: "Gebruik een goedgekeurd hulpmiddel en toegestane informatie. Een collega verstuurt het uiteindelijke antwoord.", answer: "review", why: "AI kan een concept schrijven. Een mens controleert vóór verzending de feiten, toon en eventuele toezeggingen." },
    { id: "plan", task: "Maak een eerste concept van een projectplan.", context: "De projecteigenaar moet de afbakening, middelen en datums controleren.", answer: "review", why: "AI kan een plan opzetten. De eigenaar controleert of de aannames en deadlines haalbaar zijn." },
    { id: "forecast", task: "Help bij het controleren van een financiële prognose.", context: "Een goedgekeurd hulpmiddel mag helpen. Een verantwoordelijke beoordelaar moet de gegevens, berekeningen en conclusies controleren.", answer: "review", why: "AI mag helpen bij de controle, maar kan niet zelfstandig vaststellen dat een prognose betrouwbaar is." },
  ];
  const repair = [
    { id: "project", title: "Een statusupdate zonder richting", goal: "Geef het management een korte statusupdate met onderbouwde feiten en een aanbeveling.", source: "Project Cedar: het testen loopt twee dagen achter op de planning. Een oplossing van de leverancier ontbreekt nog. Advies: wijs iemand aan die de oplossing bevestigt voordat je een nieuwe startdatum vastlegt.", facts: "Het testen loopt twee dagen achter op de planning.", risk: "De oplossing van de leverancier ontbreekt nog.", next: "Wijs iemand aan die de oplossing bevestigt voordat je een nieuwe startdatum vastlegt.", original: "Er zijn verschillende activiteiten en gesprekken geweest. Veel zaken ontwikkelen zich op allerlei manieren en het team is met meerdere onderwerpen bezig. Alles bij elkaar is dit een uitgebreide en ingewikkelde situatie die meer overleg vraagt." },
    { id: "service", title: "Het echte probleem raakt ondergesneeuwd", goal: "Help het management prioriteit te geven aan het vastgelegde probleem bij de klantenservice.", source: "Een fictief serviceteam heeft een achterstand van 18 meldingen. Twee meldingen vragen beoordeling door een specialist. Advies: regel specialistische capaciteit voordat je oplosdatums toezegt.", facts: "De achterstand bij de klantenservice bestaat uit 18 meldingen.", risk: "Twee meldingen vragen beoordeling door een specialist.", next: "Regel specialistische capaciteit voordat je oplosdatums toezegt.", original: "Bij de klantenservice spelen allerlei zaken en bestaan veel verschillende meningen. Iedereen werkt hard en wil de situatie verbeteren. Er zijn veel mogelijkheden en het kan helpen om er nog wat langer over na te denken." },
  ];
  const repairActions = [
    { id: "structure", label: "Drie korte opsommingstekens; behoud gecontroleerde feiten", why: "Een bondige structuur maakt de feiten uit de bron beter bruikbaar." },
    { id: "next", label: "Begin met het advies en de volgende stap", why: "Een concrete volgende stap maakt duidelijk wat er moet gebeuren." },
    { id: "audience", label: "Voor het management: zet vastgelegde risico's voorop", why: "Een passende doelgroep en duidelijke risico's maken de samenvatting bruikbaar voor besluiten." },
    { id: "cut", label: "Maak het zo kort mogelijk", why: "Korter is niet altijd beter: hierdoor verdwijnen belangrijke risico's en de volgende stap." },
    { id: "stats", label: "Voeg indrukwekkende cijfers toe", why: "Verzonnen cijfers zijn niet onderbouwd door de bron." },
    { id: "complex", label: "Maak het ingewikkelder", why: "Extra ingewikkelde tekst maakt het concept minder bruikbaar." },
  ];
  const hunter = [
    { id: "service-report", title: "Een overtuigend servicerapport", evidence: "Fictief kwartaalrapport: de tevredenheid steeg van 70% naar 75%. Het aantal meldingen daalde van 1.000 naar 880. Er is geen onderzoek naar de oorzaak van deze veranderingen.", corrected: "De tevredenheid steeg met vijf procentpunt en het aantal meldingen daalde met 12%. De oorzaak van deze veranderingen is niet vastgesteld.", claims: [
      { id: "satisfaction", text: "De tevredenheid steeg met vijf procentpunt.", answer: "supported", why: "75% min 70% is vijf procentpunt." },
      { id: "tickets", text: "Het aantal ondersteuningsmeldingen daalde met 40%.", answer: "contradicted", why: "Een daling van 1.000 naar 880 is 12%, geen 40%." },
      { id: "cause", text: "De chatbot veroorzaakte de verbetering.", answer: "verify", why: "Het rapport bevat geen onderzoek naar de oorzaak. Niet onderbouwd betekent niet bewezen onjuist." },
    ] },
    { id: "project-report", title: "Een stellig projectverslag", evidence: "Fictieve projectadministratie: budget 120.000; werkelijke kosten 126.000. Het mijlpalenoverzicht bevestigt dat 9 van de 10 mijlpalen zijn behaald. Er is geen vergelijking met de sector beschikbaar.", corrected: "Het project kostte 5% meer dan begroot en behaalde negen van de tien mijlpalen. De positie ten opzichte van de sector is niet vastgesteld.", claims: [
      { id: "budget", text: "Het project bleef binnen het budget.", answer: "contradicted", why: "De werkelijke kosten lagen 6.000 boven het budget, oftewel 5%." },
      { id: "milestones", text: "Negen van de tien mijlpalen zijn behaald.", answer: "supported", why: "Het mijlpalenoverzicht onderbouwt deze uitspraak rechtstreeks." },
      { id: "ranking", text: "Het project loopt voorop in de sector.", answer: "verify", why: "Voor deze uitspraak is een vergelijking met de sector nodig." },
    ] },
  ];
  const danger = [
    { id: "complaint", title: "Schoon de klacht op", brief: "Vat het probleem samen met de fictieve zakelijke assistent. De klacht is interne informatie; persoonsgegevens zijn niet nodig.", classification: "internal", preferred: "enterprise", segments: [
      { id: "name", text: "Naam: Mila Voorbeeld", dataClass: "personal", remove: true },
      { id: "phone", text: "Telefoon: 000-ALLEEN-OEFENING", dataClass: "personal", remove: true },
      { id: "email", text: "E-mail: mila@example.invalid", dataClass: "personal", remove: true },
      { id: "account", text: "Klantnummer: DEMO-0000", dataClass: "personal", remove: true },
      { id: "issue", text: "De levering kwam te laat aan.", dataClass: "internal", remove: false },
      { id: "request", text: "De klant vraagt om een update over de levering.", dataClass: "internal", remove: false },
    ] },
    { id: "restricted-plan", title: "Weglakken geeft geen toestemming", brief: "Een collega wil een beperkt toegankelijke projectnotitie naar een openbare assistent sturen. Ook zonder persoonsgegevens blijft het document beperkt toegankelijk.", classification: "restricted", preferred: "decline", segments: [
      { id: "owner", text: "Eigenaar: Rowan Voorbeeld", dataClass: "personal", remove: true },
      { id: "credential", text: "Toegangscode: OEFENING-GEEN-ECHTE-CODE", dataClass: "secret", remove: true },
      { id: "project", text: "Beperkt toegankelijk: nog niet vrijgegeven plan voor Project Lumen.", dataClass: "restricted", remove: false },
      { id: "decision", text: "Gebruik voor dit plan een goedgekeurd proces zonder AI.", dataClass: "internal", remove: false },
    ] },
  ];
  Q.content = {
    version: 1,
    order: ["inbox", "delegate", "repair", "hunter", "data-danger"],
    meta: {
      inbox: { title: "Inbox in brand", skill: "Maak een bruikbare prompt", duration: "2–3 min", takeaway: "Vertel AI wat het doel is, voor wie het antwoord is en welke grenzen gelden." },
      delegate: { title: "Uitbesteden of niet?", skill: "Kies waar AI kan helpen", duration: "2 min", takeaway: "AI kan ondersteunen. Mensen blijven verantwoordelijk en nemen de definitieve beslissingen." },
      repair: { title: "Verbeter mijn AI!", skill: "Verbeter het eerste concept", duration: "2–3 min", takeaway: "Geef gerichte feedback en behoud belangrijke feiten." },
      hunter: { title: "Feitenjacht", skill: "Volg de bronnen", duration: "2–3 min", takeaway: "Een stellig antwoord is geen bewijs. Controleer belangrijke uitspraken aan de hand van bronnen." },
      "data-danger": { title: "Datagevaar", skill: "Bescherm informatie", duration: "2 min", takeaway: "Controleer het hulpmiddel, de gegevensregels en welke informatie echt nodig is." },
    },
    slots: ["task", "context", "audience", "tone", "constraints", "format"],
    slotLabels: { task: "Taak", context: "Context", audience: "Doelgroep", tone: "Toon", constraints: "Grenzen", format: "Vorm" },
    qualityLabels: { accuracy: "juistheid", concise: "bondigheid", structured: "structuur", risks: "risico's", audience: "doelgroep", next: "volgende stap" },
    classLabels: { public: "openbaar", internal: "intern", personal: "persoonsgegevens", restricted: "beperkt toegankelijk", secret: "toegangsgegevens" },
    inbox, delegation, repair, repairActions, hunter, danger,
    categories: [{ id: "help", label: "AI kan helpen" }, { id: "human", label: "Mens beslist" }, { id: "review", label: "AI + menselijke controle" }],
    verdicts: [{ id: "supported", label: "Onderbouwd" }, { id: "verify", label: "Nog controleren" }, { id: "contradicted", label: "Weersproken" }],
    workflows: [{ id: "enterprise", label: "Zakelijke oefenassistent" }, { id: "public", label: "Openbare oefenassistent" }, { id: "decline", label: "Gebruik een goedgekeurd proces zonder AI" }],
    policy: { label: "Fictieve oefenregels — volg op het werk het beleid van je organisatie.", allowed: { enterprise: ["public", "internal"], public: ["public"] } },
  };
})(window.CDSCLearning = window.CDSCLearning || {});
