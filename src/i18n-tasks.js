window.TASK_TRANSLATIONS = {
  lt: {
    levels: {
      1: {
        name: "Bronzos sluoksnis (Neapdorotų duomenų gavimas)",
        description: "Išvalykite neapdorotas lenteles iš Kafka ir talpyklų, kol klaidingos schemos nesugadino tolesnių procesų."
      },
      2: {
        name: "Sidabro sluoksnis (SQL transformacijos)",
        description: "Kurkite analitines SQL transformacijas švariems dimensijų modeliams ir agreguotiems požymių rinkiniams."
      },
      3: {
        name: "Aukso sluoksnis (Produkcijos optimizavimas)",
        description: "Optimizuokite didelės apimties duomenų srautus. Pašalinkite duomenų perskirstymo (shuffle) iškraipymus ir atlikite Delta Lake sujungimus."
      }
    },
    tasks: {
      b_chimera: {
        name: "CHIMERA",
        desc: "Pakartotinių užklausų banga lėmė identiškų mokėjimo transakcijų pasikartojantį įrašymą.",
        skills: [
          {
            label: "Panaikinti pasikartojančias eilutes pagal transakcijos raktą",
            explain: "Pasikartojančios eilutės pašalintos pagal transakcijos ID, išsaugant unikalius įrašus."
          },
          {
            label: "Palikti tik transaction_id stulpelį",
            explain: "Atmesti user_id, amount ir timestamp stulpeliai."
          },
          {
            label: "Filtruoti pagal teigiamą mokėjimo sumą",
            explain: "Pasikartojančios transakcijos turi teigiamas sumas; dublikatai lieka."
          },
          {
            label: "Paimti tik 1 viršutinę eilutę iš duomenų rėmelio",
            explain: "Visas duomenų rėmelis sutrumpintas iki 1 įrašo."
          }
        ]
      },
      b_phantom: {
        name: "PHANTOM",
        desc: "Požymių srautas sugedo: klientų įrašai atvyko be šalies kodų ir su tuščiomis (NULL) amžiaus reikšmėmis.",
        skills: [
          {
            label: "Užpildyti trūkstamas reikšmes standartinėmis numatytosiomis",
            explain: "Trūkstami laukai tvarkingai užpildyti neatmetant klientų įrašų."
          },
          {
            label: "Pašalinti šalies ir amžiaus stulpelius iš schemos",
            explain: "Ištrinti reikalingi požymiai, būtini tolesniems srautams."
          },
          {
            label: "Atmesti visas eilutes, turinčias bent vieną NULL reikšmę",
            explain: "Atmesta 50% galiojančių klientų įrašų."
          },
          {
            label: "Padidinti amžiaus stulpelį 1",
            explain: "NULL + 1 Spark SQL lieka NULL."
          }
        ]
      },
      b_wyrm: {
        name: "WYRM",
        desc: "Klientų vardai užteršti neapdorotais valdymo baitais ir specialiais simboliais (\\x00, @#$).",
        skills: [
          {
            label: "Išvalyti eilutes naudojant reguliariosios išraiškos filtrą",
            explain: "Pašalinti neleistini valdymo simboliai, išsaugant raidinius vardus."
          },
          {
            label: "Filtruoti tik tuščius (NULL) vardus",
            explain: "Atmesti visi teisingi vardai, grąžintas tuščias duomenų rėmelis."
          },
          {
            label: "Paversti vardus mažosiomis raidėmis",
            explain: "Mažosios raidės nepašalina neapdorotų binarinių valdymo simbolių."
          },
          {
            label: "Iškviesti distinct() visoms eilutėms",
            explain: "distinct() neišvalo stulpelių tekstinio turinio."
          }
        ]
      },
      b_mimic: {
        name: "MIMIC",
        desc: "Pajamų rodikliai atvyko kaip formatuotas tekstas ('$1,250.00'), stabdantis skaitinę agregaciją.",
        skills: [
          {
            label: "Pašalinti valiutos simbolius ir konvertuoti į Double tipą",
            explain: "Valiutos simboliai pašalinti, tekstas konvertuotas į skaitinį Double tipą."
          },
          {
            label: "Tiesiogiai konvertuoti tekstą į Double",
            explain: "Tiesioginė formatuoto '$1,250.00' konversija Spark SQL grąžina NULL."
          },
          {
            label: "Tiesiogiai sumuoti tekstinį stulpelį",
            explain: "AnalysisException: negalima atlikti sum() tekstinio tipo stulpeliui."
          },
          {
            label: "Išvalyti duomenų rėmelio buferį",
            explain: "Išvalyta visa lentelė."
          }
        ]
      },
      b_stalker: {
        name: "STALKER",
        desc: "Išorinio rakto sujungimas prarado eilutes dėl nepašalintų tarpų parduotuvių koduose.",
        skills: [
          {
            label: "Pritaikyti trim() pradžios ir pabaigos tarpų pašalinimui",
            explain: "Tarpai pašalinti, sujungimo raktai vėl sutampa."
          },
          {
            label: "Filtruoti tik vieną konkrečios parduotuvės kodą",
            explain: "Atmestos Londono ir Tokijo parduotuvės, prarasti duomenys."
          },
          {
            label: "Visiškai pašalinti store_code stulpelį",
            explain: "Pašalintas išorinis raktas, būtinas tolesniems sujungimams."
          },
          {
            label: "Perskirstyti duomenų rėmelį į 10 skaidinių",
            explain: "Perskirstymas keičia skaidinius, bet nepašalina tarpų reikšmėse."
          }
        ]
      },
      s_window: {
        name: "WINDOW_RANKER",
        desc: "Atrinkti tik naujausią kiekvieno kliento būsenos atnaujinimą naudojant SQL lango funkciją.",
        skills: [
          {
            label: "Lango funkcija ROW_NUMBER(), skaidoma pagal klientą mažėjimo tvarka",
            explain: "ROW_NUMBER() pagal klientą atrenka patį vėliausią atnaujinimo įrašą."
          },
          {
            label: "GROUP BY su MAX(updated_at)",
            explain: "status stulpelis praleistas, nes nebuvo įtrauktas į GROUP BY sąlygą."
          },
          {
            label: "Bendras ORDER BY updated_at DESC LIMIT 2",
            explain: "LIMIT grąžina 2 bendras eilutes, nepriklausomai nuo klientų grupių."
          },
          {
            label: "SELECT DISTINCT customer_id, status",
            explain: "Išsaugo visus istorinius būsenų pasikeitimus, nes reikšmės unikalios."
          }
        ]
      },
      s_having: {
        name: "AGGREGATOR",
        desc: "Nustatyti prekybininkų paskyras, kurių bendra transakcijų suma viršija $10,000, naudojant SQL agregaciją.",
        skills: [
          {
            label: "GROUP BY merchant_id HAVING SUM(amount) > 10000",
            explain: "HAVING sąlyga filtruoja agreguotas sumas po grupavimo."
          },
          {
            label: "WHERE SUM(amount) > 10000 GROUP BY merchant_id",
            explain: "Sintaksės klaida: agregavimo funkcijos negali būti WHERE sąlygoje."
          },
          {
            label: "Filtruoti atskiras transakcijas > 10000",
            explain: "Filtruoja pavienes transakcijas, o ne bendrą prekybininko apyvartą."
          },
          {
            label: "GROUP BY merchant_id be sumos filtro",
            explain: "Grąžina visus prekybininkus nepritaikius apyvartos ribos."
          }
        ]
      },
      s_join: {
        name: "ORPHAN_HUNTER",
        desc: "Rasti visus aktyvius vartotojus, kurie niekada neatliko užsakymo, naudojant SQL anti-join.",
        skills: [
          {
            label: "LEFT JOIN ... WHERE o.order_id IS NULL",
            explain: "Anti-join atrenka nesusietus vartotojus su NULL išoriniais raktais."
          },
          {
            label: "INNER JOIN tarp vartotojų ir užsakymų",
            explain: "Vidinis sujungimas grąžina vartotojus su užsakymais, o ne be jų."
          },
          {
            label: "WHERE user_id NOT IN (užsakymų po-užklausa)",
            explain: "Pažeidžiama NULL reikšmėms: jei užsakymuose yra NULL, NOT IN negrąžina eilučių."
          },
          {
            label: "CROSS JOIN vartotojų ir užsakymų lentelėms",
            explain: "Dekarto sandauga sukuria nekontroliuojamą eilučių dauginimąsi."
          }
        ]
      },
      s_case: {
        name: "CLASSIFIER",
        desc: "Suskirstyti klientus į 'VIP' (išlaidos >= 1000), 'REGULAR' (>= 100) ir 'NEW' naudojant CASE WHEN.",
        skills: [
          {
            label: "Nuoseklus CASE WHEN lygmenų skirstymas",
            explain: "Nuoseklios sąlygos pirmiausia patikrina didžiausias išlaidų ribas."
          },
          {
            label: "Apversta CASE WHEN tvarka (>= 100 pirma)",
            explain: "Išlaidos >= 100 tikrinamos pirmiausia, todėl VIP priskiriami REGULAR."
          },
          {
            label: "Dvejetainė IF sąlyga",
            explain: "Praleidžiamas 'NEW' lygmuo, naujos paskyros tampa REGULAR."
          },
          {
            label: "Priskirti visiems fiksuotą 'VIP'",
            explain: "Statinė reikšmė neturinčias išlaidų paskyras pažymi kaip VIP."
          }
        ]
      },
      s_coalesce: {
        name: "COALESCER",
        desc: "Standartizuoti atsarginį kontaktą pagal prioritetą: mobilusis -> darbo tel. -> el. paštas -> 'NEPASIEKIAMAS'.",
        skills: [
          {
            label: "COALESCE(mobile_phone, work_phone, email, 'NEPASIEKIAMAS')",
            explain: "COALESCE grąžina pirmą ne tuščią (non-null) reikšmę pagal nurodytą prioritetą."
          },
          {
            label: "NVL(mobile_phone, email)",
            explain: "Praleidžia darbo telefoną ir nepateikia atsarginio varianto, kai abu tušti."
          },
          {
            label: "CONCAT visiems kontaktų stulpeliams",
            explain: "Standartiniame SQL eilučių jungimas su NULL grąžina NULL."
          },
          {
            label: "Pasirinkti tik el. paštą",
            explain: "Ignoruoja telefonus ir grąžina NULL paskyroms be el. pašto."
          }
        ]
      },
      g_broadcast: {
        name: "BROADCAST_JOIN",
        desc: "500 mln. eilučių faktų lentelė jungiama su 50 eilučių dimensija, sukeldama tinklo perpildymo (shuffle spill) nuostolius.",
        skills: [
          {
            label: "Pritaikyti broadcast() užuominą mažai žinyno lentelei",
            explain: "Broadcast Hash Join išsiunčia 50 eilučių lentelę visiems vykdytojams, panaikindamas duomenų perpildymą."
          },
          {
            label: "Transliuoti (broadcast) 500 mln. faktų lentelę",
            explain: "500 mln. eilučių lentelės transliavimas išeikvoja pagrindinio mazgo (driver) JVM atmintį."
          },
          {
            label: "Perskirstyti faktų lentelę į 1000 skaidinių",
            explain: "SortMergeJoin vis tiek atlieka pilną duomenų persiuntimą per tinklą."
          },
          {
            label: "Apriboti faktų lentelę iki 1 000 eilučių",
            explain: "Apriboja eilučių skaičių ir atmeta produkcinius duomenis."
          }
        ]
      },
      g_delta_merge: {
        name: "DELTA_MERGE",
        desc: "Atlikti atominį UPSERT Delta Lake: atnaujinti esamus ir įterpti naujus įrašus pagal customer_id.",
        skills: [
          {
            label: "Delta Lake MERGE INTO su atnaujinimu sutapus ir įterpimu nesutapus",
            explain: "Atlieka atominį Delta ACID atnaujinimą: atnaujina esamus ir prideda naujus įrašus."
          },
          {
            label: "Perrašyti tikslinę lentelę šaltinio partija",
            explain: "Perrašė tikslinę lentelę, ištrindama esamus istorinius klientų įrašus."
          },
          {
            label: "Pridėti šaltinio partiją tiesiai prie tikslinės lentelės",
            explain: "Prideda dublikuotas eilutes esamiems klientams be atnaujinimo."
          },
          {
            label: "Ištrinti visas ne tuščias klientų eilutes",
            explain: "Ištrynė visas aktyvias eilutes iš tikslinės lentelės."
          }
        ]
      },
      g_partition_prune: {
        name: "PARTITION_PRUNING",
        desc: "Užklausos 100 TB įvykių ežere atlieka pilną lentelės nuskaitymą, nes filtrai nesutampa su skaidinių raktais.",
        skills: [
          {
            label: "Filtruoti tiesiogiai pagal tikslius fizinių skaidinių stulpelius",
            explain: "Spark Catalyst atmeta nereikalingus skaidinius ir praleidžia neatitinkančius saugyklos kelius."
          },
          {
            label: "Konvertuoti skaidinio stulpelį į tekstą filtre",
            explain: "Funkcijos skaidinių stulpeliuose gali atjungti failų praleidimo metaduomenis."
          },
          {
            label: "Vykdyti užklausą be WHERE filtro",
            explain: "Sukelia pilną 100 TB nuskaitymą per visus skaidinius."
          },
          {
            label: "Atrinkti 1% lentelės eilučių imtį",
            explain: "TABLESAMPLE grąžina dalinius duomenis ir netinka produkcinei užklausai."
          }
        ]
      },
      g_skew_salt: {
        name: "KEY_SALTING",
        desc: "90% srauto tenka vienam populiariam klientui, todėl viena Spark užduotis smarkiai vėluoja (skew).",
        skills: [
          {
            label: "Sūdymas (Salting): pridėti atsitiktinį raktą tolygiam perskirstymui",
            explain: "Sūdymas išskaido perkrautą raktą į tolygias dalis tarp vykdytojų."
          },
          {
            label: "Perskirstyti visą duomenų rėmelį į 1 skaidinį",
            explain: "Priverčia visus 85 mln. įrašų apdoroti viename vykdytojo branduolyje."
          },
          {
            label: "Visiškai išfiltruoti didžiausią klientą",
            explain: "Išfiltravus perkrautą raktą prarandami galiojantys produkciniai duomenys."
          },
          {
            label: "Sumažinti skaidinių skaičių iki 200 su coalesce",
            explain: "coalesce() neatlieka perskirstymo ir nesubalansuoja netolygių raktų."
          }
        ]
      },
      g_cache_unpersist: {
        name: "PERSIST_UNPERSIST",
        desc: "Iteracinis skaičiavimas pakartotinai naudoja tarpinį duomenų rėmelį df_clean per 10 veiksmų. Optimizuokite atmintį.",
        skills: [
          {
            label: "Išsaugoti su MEMORY_AND_DISK, o baigus ciklą iškviesti unpersist()",
            explain: "Išsaugo tarpinius etapus išvengiant perskaičiavimo ir atlaisvina JVM atmintį baigus."
          },
          {
            label: "Surinkti visus paskirstytus duomenis į pagrindinio mazgo (driver) atmintį",
            explain: "collect() atsiunčia visus paskirstytus duomenis į driver atmintį, sukeldamas OOM."
          },
          {
            label: "Tiesiogiai iškviesti checkpoint()",
            explain: "checkpoint() nepavyksta, kai SparkContext nenurodytas kontrolinio taško katalogas."
          },
          {
            label: "Iškviesti .cache() 10 kartų cikle",
            explain: "Pertekliniai cache() iškvietimai nepagreitina vykdymo."
          }
        ]
      }
    }
  }
};
