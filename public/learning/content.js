((Q) => {
  "use strict";
  const choice = (id, label, quality) => ({ id, label, quality });
  const ingredients = (intent, context, delay = false) => ({
    role: [choice("role-good", delay ? "Je bent een projectassistent die een conceptupdate schrijft" : "Je bent een communicatieadviseur die helpt een concept te schrijven", "good"), choice("role-weak", "Je bent een algemene assistent zonder vakperspectief", "weak"), choice("role-unsafe", delay ? "Je bent de projectleider en mag zelf een onbevestigde opleverdatum vastleggen" : "Je bent de directeur en mag zelf korting goedkeuren", "unsafe")],
    intent: [choice("intent-good", intent, "good"), choice("intent-weak", delay ? "Schrijf iets over het project" : "Schrijf iets over het verzoek", "weak"), choice("intent-unsafe", delay ? "Garandeer dat het project vrijdag wordt opgeleverd" : "Zeg de gevraagde korting direct toe", "unsafe")],
    context: [choice("context-good", context, "good"), choice("context-weak", "Vertel over de lange geschiedenis van het bedrijf", "weak"), choice("context-unsafe", delay ? "Verzin een regel die oplevering op vrijdag garandeert" : "Verzin een bedrijfsregel die de korting toestaat", "unsafe")],
    attitude: [choice("attitude-good", "Professioneel, vriendelijk en respectvol", "good"), choice("attitude-weak", "Zakelijk en afstandelijk", "weak"), choice("attitude-wrong", "Bot en confronterend", "weak")],
    template: [choice("template-good", "Korte e-mail met een onderwerpregel", "good"), choice("template-weak", "Een lang betoog", "weak"), choice("template-wrong", "Een bericht op sociale media", "weak")],
  });
  const inbox = [
    {
      id: "discount", title: "Een lastig kortingsverzoek", brief: "Een fictieve klant vraagt 40% korting. Je mag die niet toezeggen. Schrijf een respectvol antwoord dat de relatie goed houdt.",
      ingredients: ingredients("Wijs 40% korting af en behoud de klantrelatie", "Bestaande zakelijke klant; 40% korting gevraagd; je mag geen korting toezeggen"),
      feedback: { role: "Bij Rol ontbreekt een passend vakperspectief. Een rol geeft AI geen beslissingsbevoegdheid.", intent: "Bij Intentie ontbreekt het doel: wijs de korting af en behoud de relatie.", context: "Bij Context ontbreekt dat je geen korting mag toezeggen. Vermeld ook de doelgroep en relevante feiten.", attitude: "Bij Houding past een vriendelijke, respectvolle toon beter bij deze klantrelatie.", template: "Bij Template ontbreekt de gewenste korte e-mail met onderwerpregel." },
      subject: "Uw kortingsverzoek", greeting: "Beste Rowan,", goodBody: "Bedankt voor uw verzoek. Wij kunnen de gevraagde korting van 40% niet aanbieden.", positive: "Wij waarderen onze samenwerking en bespreken graag welke andere mogelijkheden zijn toegestaan.", unsafe: "Wij kunnen uw korting van 40% direct goedkeuren.", invented: "Volgens ons bedrijfsbeleid krijgen alle bestaande klanten gegarandeerd 40% korting.",
    },
    {
      id: "delay", title: "Een project loopt vertraging op", brief: "Een fictief project loopt vertraging op door een leverancier. Een nieuwe opleverdatum is nog niet bevestigd. Informeer je collega's zonder een deadline te verzinnen.",
      ingredients: ingredients("Informeer collega's over de vertraging en de volgende stap", "Vertraging bij de leverancier; nieuwe datum onbekend; doelgroep: collega's; verzin geen deadline", true),
      feedback: { role: "Bij Rol past een projectassistent die een concept schrijft. AI mag geen onbevestigde opleverdatum vastleggen.", intent: "Bij Intentie ontbreekt het doel: informeer collega's over de vertraging en de volgende stap.", context: "Bij Context ontbreken de doelgroep en het feit dat een nieuwe datum nog niet is bevestigd.", attitude: "Bij Houding past een professionele, vriendelijke en respectvolle toon.", template: "Bij Template past een korte e-mail met onderwerpregel." },
      examples: [
        { id: "confirmed", label: "A · Een bevestigde wijziging", quality: "good", input: "De fictieve kantoorverhuizing naar zaal 4 is bevestigd voor maandag.", output: "Onderwerp: Nieuwe werkplek\nBeste collega's, maandag verhuizen we naar zaal 4. Bekijk vooraf de route. Bedankt voor jullie medewerking.", why: "Dit voorbeeld toont een korte e-mail met een duidelijke volgende stap. De zaal en datum horen alleen bij het voorbeeld." },
        { id: "uncertain", label: "B · Nog geen datum bekend", quality: "good", input: "Een leverancier onderzoekt een storing. Het herstelmoment is nog onbekend.", output: "Onderwerp: Update over de storing\nBeste collega's, de leverancier onderzoekt de storing. Het herstelmoment is nog onbekend. We delen een update zodra dit bevestigd is.", why: "Dit voorbeeld laat zien hoe je onzekerheid eerlijk benoemt zonder een datum te verzinnen." },
        { id: "advert", label: "C · Een reclamebericht", quality: "weak", input: "Promoot een nieuw product op sociale media.", output: "Geweldig nieuws! Ontdek nu ons nieuwste product! #Nieuw", why: "Dit reclamevoorbeeld stuurt op een ongeschikte vorm en toon voor een projectupdate." },
        { id: "promise", label: "D · Een zekere belofte", quality: "unsafe", input: "De planning is nog niet bevestigd.", output: "Wij garanderen dat alles vrijdag klaar is.", why: "Dit voorbeeld leert een onbevoegde toezegging aan: vrijdag is niet bevestigd." },
      ],
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
    { id: "structure", label: "Template: drie korte punten; behoud bronfeiten", why: "RICHT — Template: een bondige structuur maakt gecontroleerde feiten beter bruikbaar." },
    { id: "next", label: "Intentie: begin met advies en volgende stap", why: "RICHT — Intentie: maak duidelijk wat het antwoord moet bereiken." },
    { id: "audience", label: "Context: voor management, met vastgelegde risico's", why: "RICHT — Context: doelgroep en bronfeiten bepalen welke risico's aandacht vragen." },
    { id: "cut", label: "Maak het zo kort mogelijk", why: "Korter is niet altijd beter: hierdoor verdwijnen belangrijke risico's en de volgende stap." },
    { id: "stats", label: "Voeg indrukwekkende cijfers toe", why: "Verzonnen cijfers zijn niet onderbouwd door de bron." },
    { id: "complex", label: "Maak het ingewikkelder", why: "Extra ingewikkelde tekst maakt het concept minder bruikbaar." },
  ];
  const metaPrompt = {
    original: "Maak hier een goede update van.",
    options: [
      { id: "richt", label: "Controleer met RICHT, vraag ontbrekende informatie uit en herschrijf de prompt", why: "Een gerichte meta-prompt laat AI helpen de instructie te verbeteren, zonder ontbrekende feiten te verzinnen." },
      { id: "longer", label: "Maak de prompt alleen langer", why: "Meer woorden lossen een ontbrekende doelgroep of antwoordvorm niet op." },
      { id: "invent", label: "Vul ontbrekende informatie zelf overtuigend in", why: "AI mag ontbrekende projectfeiten niet verzinnen. Vraag de gebruiker om verduidelijking." },
    ],
    questions: [
      { id: "audience", text: "Voor wie is de statusupdate?", answer: "management", options: [{ id: "management", label: "Het management dat capaciteit moet toewijzen" }, { id: "team", label: "Collega's die technische details bespreken" }, { id: "public", label: "Een publiek op sociale media" }] },
      { id: "template", text: "Welke antwoordvorm helpt bij deze taak?", answer: "bullets", options: [{ id: "bullets", label: "Drie korte punten: status, risico en advies" }, { id: "essay", label: "Een uitgebreid betoog zonder vaste indeling" }, { id: "post", label: "Een enthousiaste sociale-mediapost" }] },
    ],
  };
  const methods = [
    { id: "structured", label: "Haal bronwaarden op, bereken verschillen en toets de conclusies", output: "1. Bronwaarden: tevredenheid 70% → 75%; meldingen 1.000 → 880.\n2. Verschillen: 75 − 70 = 5 procentpunt; (1.000 − 880) / 1.000 = 12%.\n3. Controle: een oorzaak is niet onderzocht; schrijf de verbetering niet aan de chatbot toe.", why: "Controleerbare tussenstappen maken zichtbaar welke berekeningen en brongegevens de conclusie dragen." },
    { id: "verbose", label: "Schrijf vooral een heel lange uitleg", output: "Er is een brede ontwikkeling zichtbaar. De cijfers passen bij verschillende mogelijke verhalen. Een uitgebreide bespreking biedt veel ruimte voor interpretatie.", why: "Lengte is geen controle: de uitgangswaarden en berekeningen ontbreken." },
    { id: "guess", label: "Kies direct de meest overtuigende conclusie", output: "De chatbot heeft de tevredenheid sterk verhoogd en het aantal meldingen met 40% verlaagd.", why: "Een overtuigend antwoord kan een rekenfout en een niet-onderbouwde oorzaak bevatten." },
  ];
  const variants = [
    { id: "a", label: "Antwoord A", output: "De kosten liggen 5% boven budget. Negen van de tien mijlpalen zijn behaald. Het project loopt voorop in de sector." },
    { id: "b", label: "Antwoord B", output: "Er is 6.000 meer uitgegeven dan begroot. Het project behaalde 9 van de 10 mijlpalen en is een koploper in de sector." },
    { id: "c", label: "Antwoord C", output: "De kosten zijn 5% hoger dan het budget. Er zijn 9 van de 10 mijlpalen behaald. Zonder sectorvergelijking is een koppositie niet vast te stellen." },
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
    version: 3,
    order: ["inbox", "delegate", "repair", "hunter", "data-danger"],
    meta: {
      inbox: { title: "Inbox in brand", skill: "Bouw een RICHT-prompt", duration: "3 min", takeaway: "Gebruik Rol, Intentie, Context, Houding en Template. Few-shot voorbeelden zijn een optionele aanvulling." },
      delegate: { title: "Uitbesteden of niet?", skill: "Kies waar AI kan helpen", duration: "2 min", takeaway: "AI kan ondersteunen. Mensen blijven verantwoordelijk en nemen de definitieve beslissingen." },
      repair: { title: "Verbeter mijn AI!", skill: "Meta-prompting en verbeteren", duration: "3 min", takeaway: "Laat AI je prompt met RICHT verbeteren en ontbrekende informatie uitvragen. Controleer het voorstel zelf." },
      hunter: { title: "Feitenjacht", skill: "Tussenstappen en zelf-consistentie", duration: "3 min", takeaway: "Controleer tussenresultaten en vergelijk antwoorden. Ook overeenstemming moet je aan bronnen toetsen." },
      "data-danger": { title: "Datagevaar", skill: "Bescherm informatie", duration: "2 min", takeaway: "Controleer het hulpmiddel, de gegevensregels en welke informatie echt nodig is." },
    },
    slots: ["role", "intent", "context", "attitude", "template"],
    slotLabels: { role: "Rol", intent: "Intentie", context: "Context", attitude: "Houding", template: "Template" },
    richt: [
      { id: "role", label: "Rol", definition: "Vanuit welke deskundigheid helpt AI? Een rol geeft geen beslissingsbevoegdheid.", example: "Je bent een communicatieadviseur." },
      { id: "intent", label: "Intentie", definition: "Wat moet het antwoord bereiken?", example: "Wijs de korting af en behoud de klantrelatie." },
      { id: "context", label: "Context", definition: "Welke feiten, doelgroep en grenzen gelden?", example: "Bestaande klant; 40% gevraagd; geen korting toezeggen." },
      { id: "attitude", label: "Houding", definition: "Welke toon en stijl passen?", example: "Vriendelijk, professioneel en respectvol." },
      { id: "template", label: "Template", definition: "Welke vorm moet het antwoord krijgen?", example: "Korte e-mail met onderwerpregel." },
    ],
    techniques: [
      { id: "meta", title: "Meta-prompting", text: "Laat AI je prompt met RICHT verbeteren en eerst ontbrekende informatie uitvragen.", game: "repair" },
      { id: "cot", title: "Chain-of-thought prompting", text: "Stuur op controleerbare tussenstappen: bronwaarden → berekening → korte conclusie. Meer tekst is geen bewijs.", game: "hunter" },
      { id: "few-shot", title: "Few-shot voorbeelden", text: "Je kunt passende invoer-uitvoervoorbeelden toevoegen. Dit is optioneel. Neem het patroon over, niet de voorbeeldfeiten.", game: "inbox" },
      { id: "consistency", title: "Zelf-consistentie", text: "Vergelijk meerdere afzonderlijke antwoorden en toets de conclusie aan bronnen. Een meerderheid kan ongelijk hebben.", game: "hunter" },
    ],
    qualityLabels: { accuracy: "juistheid", concise: "bondigheid", structured: "structuur", risks: "risico's", audience: "doelgroep", next: "volgende stap" },
    classLabels: { public: "openbaar", internal: "intern", personal: "persoonsgegevens", restricted: "beperkt toegankelijk", secret: "toegangsgegevens" },
    inbox, delegation, repair, repairActions, hunter, danger, metaPrompt, methods, variants,
    categories: [{ id: "help", label: "AI kan helpen" }, { id: "human", label: "Mens beslist" }, { id: "review", label: "AI + menselijke controle" }],
    verdicts: [{ id: "supported", label: "Onderbouwd" }, { id: "verify", label: "Nog controleren" }, { id: "contradicted", label: "Weersproken" }],
    workflows: [{ id: "enterprise", label: "Zakelijke oefenassistent" }, { id: "public", label: "Openbare oefenassistent" }, { id: "decline", label: "Gebruik een goedgekeurd proces zonder AI" }],
    policy: { label: "Fictieve oefenregels — volg op het werk het beleid van je organisatie.", allowed: { enterprise: ["public", "internal"], public: ["public"] } },
  };
})(window.CDSCLearning = window.CDSCLearning || {});
