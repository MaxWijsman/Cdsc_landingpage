# COMMIT Datascience Cell

Een statisch portaal met de oranje teamnaam, het CDSC-logo en links naar Producten, Team en Contact. De centrale oranje ster opent het AI-leerpad. Bewegende printbanen lichten de bestemmingen om de beurt uit.

De lichte achtergrond, het oranje, het ministerieblauw, RO Sans en de smalle koppen sluiten aan bij de openbare vormgeving van [Defensie.nl](https://www.defensie.nl/). De hoofdtitel gebruikt het opensourcelettertype Orbitron. Alle lettertypen worden lokaal aangeboden. Het oorspronkelijke CDSC-logo blijft ongewijzigd; de bewegende afbeelding is nagemaakt in SVG.

## Lokaal bekijken

Voer vanuit deze map uit:

    python -m http.server 8080 --bind 127.0.0.1 --directory public

Open <http://localhost:8080>. Stop de server met Ctrl+C. Je kunt ook public/index.html rechtstreeks openen.

## Links en teksten instellen

Bewerk public/site-config.js. Vul bij elke bestemming de URL in:

    products: { label: "Producten", url: "https://example.org/products" }

De vier configuratiesleutels zijn products, team, contact en learning. De centrale ster opent standaard het ingebouwde AI Werkplekavontuur (`learning.mode: "embedded"`). Wil je een externe leerpagina gebruiken, kies dan `learning.mode: "external"` en vul `learning.url` in. Lege of ongeldige externe URL's tonen ‘Binnenkort beschikbaar’. Geldige HTTPS-, HTTP-, mailto- en tel-links openen in hetzelfde tabblad. De configuratie is openbaar.

Met teamName wijzig je de grote kop en de paginatitel. Pas ook de standaardtitel en labels in public/index.html aan voor bezoekers zonder JavaScript. Oudere instellingen voor introductieteksten worden niet meer gebruikt. Alle standaardteksten, scenario's, uitleg en feedback zijn Nederlandstalig; de officiële teamnaam blijft COMMIT Datascience Cell.

## Animatie

De drie printbanen verbinden het logo met Producten, Team en Contact. Alle banen blijven zacht en onafhankelijk bewegen. De geselecteerde baan schuift verder over de verbinding, met de oranje eindcirkel, over de helft van de eerdere afstand en met de oorspronkelijke snelheid. Elke cyclus van drie seconden bestaat uit uitschuiven, vasthouden en terugschuiven. Daarna beweegt de baan 600 ms rustig voordat de volgende bestemming oplicht. Bij een andere muis- of toetsenbordselectie schuift de vorige baan eerst in 450 ms terug. Het kleine oranje lichtpunt loopt van de eindcirkel naar de bestemming.

De ster blijft zonder letters. De teamnaam staat boven het logo en de links. Op mobiel lopen de printbanen naast het logo naar de onder elkaar geplaatste bestemmingen.

De knop met het pauzepictogram stopt de decoratieve animatie en verandert in een afspeelknop. De toegankelijke naam en het tekstlabel bij aanwijzen beschrijven de actie. De systeemvoorkeur voor minder beweging stopt automatisch bewegen en wisselen; statische markering bij muis- en toetsenbordgebruik blijft werken. Verborgen tabbladen stoppen de animatie. Zonder JavaScript blijven het logo, de teamnaam en de niet-actieve bestemmingslabels leesbaar.

## GitHub Pages

1. Push het project naar de main-branch van de repository.
2. Kies bij Settings → Pages → Build and deployment voor GitHub Actions.
3. Start Deploy GitHub Pages bij Actions, of push een nieuwe wijziging.
4. Open de URL van de geslaagde publicatie.

De workflow publiceert public/. Bij een andere standaardbranch moet je de workflowtrigger aanpassen. GitHub Pages moet ingeschakeld zijn om te kunnen publiceren. Zie de [documentatie over GitHub Pages-workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## GitLab Pages

Push het project, inclusief .gitlab-ci.yml, naar de standaardbranch van GitLab. Met beschikbare CI-runners en ingeschakelde Pages publiceert de pipeline public/. De URL staat bij Deploy → Pages. De configuratie gebruikt de huidige pages.publish-syntaxis van GitLab.com; oudere zelfbeheerde versies kunnen een andere syntaxis vereisen. Zie de [GitLab Pages-documentatie](https://docs.gitlab.com/user/project/pages/).

De publicatietaak gebruikt de officiële image python:3.11-alpine. De taak toont de Python-versie, controleert alle statische bestanden op de hoofd-URL en onder een repositorypad, en publiceert public/ rechtstreeks. Een aparte testtaak gebruikt node:24-alpine. De Python-image heeft geen pip-pakketten, Node.js of compilatie nodig. De ingebouwde HTTP-server van Python 3.11 kan public/ ook lokaal aanbieden met het bovenstaande commando.

Beide hosts gebruiken dezelfde bestanden en relatieve URL's. Er is geen backend, bouwstap of pakketinstallatie.

## Controles

    node --check public/app.js
    node --check public/site-config.js
    node --test
    python tests/check_static_site.py

De tests controleren de startpagina, alle vijf spellen, scores en veiligheidsgrenzen, bronnen en fictieve regels, laden bij openen, sluiten van het dialoogvenster, herstel van voortgang, opnieuw spelen en afronding. Controleer wijzigingen in de opmaak ook visueel in een browser. GitHub Pages wacht op de JavaScript-tests en de controle in Python 3.11 Alpine.

## AI Werkplekavontuur

Kies de oranje ster om het leerpaneel onderaan het scherm te openen. Alle spellen zijn direct beschikbaar:

1. **Inbox in brand** — bouw een RICHT-prompt en kies passende few-shot voorbeelden voor een tweede e-mailscenario.
2. **Uitbesteden of niet?** — verdeel acht werktaken naar de passende rol voor AI en mensen.
3. **Verbeter mijn AI!** — laat AI je prompt met RICHT verbeteren en pas daarna een samenvatting aan in drie beurten.
4. **Feitenjacht** — controleer tussenstappen, vergelijk drie antwoorden en toets zes uitspraken aan fictieve bronnen.
5. **Datagevaar** — lak gegevens weg in twee fictieve documenten en kies een veilig proces.

Antwoorden zijn vooraf ontworpen simulaties met het label ‘Gesimuleerde AI’. Er is geen extern AI-model, account, backend, telemetrie of API-sleutel. Alle namen en documenten zijn fictief. De oefenregels voor Datagevaar staan in `public/learning/content.js`. Vervang die alleen door beoordeeld organisatiebeleid en verhoog bij inhoudelijke wijzigingen de revisie van het spel.

Het leerpaneel gebruikt een standaard modaal HTML-dialoogvenster. Escape, de sluitknop en een bewuste klik op de achtergrond sluiten het paneel. De toetsenbordfocus keert terug naar de ster. De printbanen pauzeren zolang het paneel open is. Na het sluiten geldt de eerdere pauzekeuze weer. Op telefoons en korte schermen wordt het paneel groter. De voorkeur voor minder beweging schakelt decoratieve overgangen uit.

Voortgang wordt na betekenisvolle keuzes opgeslagen in localStorage onder `cdsc.ai-office-quest.v1`. Deze gegevens horen bij de huidige browser en website en worden niet tussen apparaten of tussen GitHub en GitLab gesynchroniseerd. Bij opslagbeperkingen, beschadigde gegevens of opslagfouten blijft de voortgang alleen tijdens het bezoek beschikbaar. Niet-ondersteunde opslagformaten blijven behouden totdat de gebruiker het wissen bevestigt. De vertaling behoudt bestaande spelcodes en revisies, zodat eerder opgeslagen voortgang bruikbaar blijft.

Elk spel heeft een score van 0–100 en maximaal drie sterren: vanaf 40 één ster, vanaf 70 twee en vanaf 90 drie. Onopgeloste kritieke veiligheidsfouten beperken een poging tot maximaal 39 punten. Voltooiing registreert deelname en is geen bewijs van bekwaamheid. Opnieuw spelen behoudt de beste score. De badge ‘AI-vaardig — Oefenbadge’ verschijnt wanneer alle vijf beste scores minstens 70 zijn, zonder onopgeloste kritieke veiligheidsfouten.

Inhoud en spelcode worden bij de eerste opening geladen. Nieuwe spellen volgen het bestaande registercontract in `public/learning/core.js`: createAttempt, reduce, evaluate, render en hydrate, met versies en tests. Verhoog de spelrevisie bij onverenigbare inhouds- of scorewijzigingen; andere spellen behouden hun voortgang. Houd interne ID's gescheiden van de Nederlandse labels voor promptonderdelen, kwaliteitskenmerken en informatieklassen.

## RICHT en promptingtechnieken

RICHT staat voor Rol, Intentie, Context, Houding en Template. Rol beschrijft het vakperspectief van AI en geeft geen beslissingsbevoegdheid. Intentie beschrijft het doel. Context bevat feiten, doelgroep en grenzen. Houding gaat uitsluitend over toon en stijl. Template bepaalt de antwoordvorm. De spiekkaart is vanuit elk spel beschikbaar via de vraagtekenknop; teruggaan behoudt de opdracht en keuzes. Het eindoverzicht biedt dezelfde spiekkaart.

Inbox in brand beoordeelt de vijf onderdelen met 15, 25, 30, 15 en 15 punten. In de tweede ronde zijn twee van vier voorbeelden passend; elk levert 50 punten op. Het patroon wordt overgenomen, maar de voorbeeldfeiten worden niet naar de nieuwe situatie gekopieerd. Een onbevoegde toezegging activeert de bestaande veiligheidsgrens.

Meta-prompting betekent hier: AI helpt een prompt verbeteren, vraagt ontbrekende Context en Template uit en maakt een controleerbaar voorstel. De juiste meta-prompt levert 40 punten op en elk passend antwoord op de twee verduidelijkingsvragen 30. De tweede ronde behoudt de drie bestaande verbeterbeurten.

Chain-of-thought prompting wordt geoefend met controleerbare tussenresultaten en een korte onderbouwing. De juiste aanpak levert in Feitenjacht 20 punten op; classificatie en brongebruik tellen samen voor 80. In de tweede ronde bekijk je drie afzonderlijke gesimuleerde antwoorden voordat je de uitspraken beoordeelt. Twee antwoorden bevatten dezelfde ongefundeerde claim. Zelf-consistentie vervangt daarom geen broncontrole; overeenstemming levert op zichzelf geen juistheidspunten op.

De inhoudsversie is 2. Inbox in brand, Verbeter mijn AI! en Feitenjacht gebruiken spelrevisie 2; alleen deze drie spellen moeten na een upgrade opnieuw worden gespeeld. De twee andere spellen behouden hun compatibele scores en checkpoints. Een melding noemt de gewijzigde spellen en verdwijnt blijvend nadat de gebruiker ‘Begrepen’ kiest. Het opslagschema en de sleutel blijven gelijk. Voorbeeldkeuzes, antwoorden op verduidelijkingsvragen en bekeken antwoordvarianten worden eveneens lokaal opgeslagen. Het totaal blijft vijf spellen, 500 punten en vijftien sterren.

De richtduur blijft 12–15 minuten, zonder tijdslimiet. Deze duur moet met beginners worden getoetst. De simulaties demonstreren technieken; ze garanderen geen identieke resultaten bij ieder AI-model. Achtergrond: [few-shot prompting](https://arxiv.org/abs/2005.14165), [Chain-of-thought prompting](https://arxiv.org/abs/2201.11903) en [zelf-consistentie](https://arxiv.org/abs/2203.11171).

## Bronnen van bestanden

- Logo.png: aangeleverd CDSC-logo, ongewijzigd.
- public/assets/fonts/RO-SansWebText-Regular.woff2: https://www.defensie.nl/assets/fonts/v1/RO-SansWebText-Regular.woff2
- public/assets/fonts/RobotoCondensed-Bold.woff2: https://www.defensie.nl/assets/fonts/v1/RobotoCondensed-Bold.woff2
- public/assets/fonts/Orbitron.ttf: https://github.com/google/fonts/tree/main/ofl/orbitron (SIL Open Font License, meegeleverd als OFL-Orbitron.txt).
