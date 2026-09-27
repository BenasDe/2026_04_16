(function () {
  const STORAGE_KEY = 'pyspark_survivor_lang';
  let currentLang = 'lt';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'lt') {
      currentLang = saved;
    }
  } catch (e) {}

  const DICT = {
    lt: {
      doc_title: "PySpark Survivor: Duomenų ežero kronikos",
      hud_level: "LYGIS {num}",
      hud_engine: "Variklis:",
      hud_timer_title: "Praėjęs laikas",
      hud_espresso: "Espreso:",
      hud_espresso_title: "Espreso klaidų taisymui",
      hud_staged: "Paruošta:",
      hud_staged_title: "Anomalijos įtrauktos į DAG",
      btn_run_pipeline: "PALEISTI PIPELINE",
      btn_run_pipeline_title: "Patikrinti ir įdiegti visas paruoštas transformacijas",
      music_on: "Muzika: Įjungta",
      music_off: "Muzika: Išjungta",
      music_title_on: "Išjungti fono muziką",
      music_title_off: "Įjungti fono muziką",
      btn_leaderboard: "Lyderių lentelė",
      btn_leaderboard_title: "Žiūrėti globalią lyderių lentelę",
      controls_hint: "Judėjimas: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> arba <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> | Spustelėkite gretimus laukelius | Rinkite espreso puodelius klaidų taisymui",
      lang_name: "LT",
      lang_title: "Pakeisti kalbą į anglų (EN)",
      dpad_run: "LEISTI",

      menu_badge: "HOUSTON WE HAVE DATA",
      menu_title: "PIPELINE",
      menu_subtitle: "Nuo nulio iki produkcijos: Duomenų inžinerijos „Roguelike“",
      rule_levels: "<strong>3  lygiai:</strong> Bronza (PySpark) -> Sidabras (SQL) -> Auksas (Spark/Delta Lake optimizavimas).",
      rule_espresso: "<strong>Išgyvenimas su espreso:</strong> Pradedate su <strong>0 espreso</strong>. Rinkite kavos puodelius žemėlapyje, kad galėtumėte išgyventi radus klaidas.",
      rule_blind: "<strong>Paruošimas:</strong> Kodo patikrinamas vyksta tik vykdant <strong>PALEISTI PIPELINE</strong>.",
      rule_penalties: "<strong>Taisymai ir baudos:</strong> Kiekviena klaida sunaudoja <strong>1 espreso</strong> ir prideda <strong>+60s baudą</strong> prie galutinio laiko. Pasibaigus kavai, Game Over.",
      rule_leaderboard: "<strong>Lyderių lentelė:</strong> Laikmatis fiksuoja greitį nuo paleidimo iki 3 lygio užbaigimo.",
      btn_start_run: "PRADĖTI \"Pipeline\" DIEGIMĄ",
      btn_view_leaderboard: "ŽIŪRĖTI LYDERIŲ LENTELĘ",

      anomaly_inspector_title: "ANOMALIJŲ INSPEKTORIUS",
      anomaly_default_title: "ANOMALIJA",
      anomaly_default_desc: "Analizuojama gaunama skaidinių telemetrija...",
      skills_header: "Pasirinkite transformaciją, kurią norite įtraukti į DAG:",
      battle_system_ready: "[SISTEMA] Pasiruošta. Pasirinkite transformaciją, kurią norite įtraukti į duomenų srauto DAG.",
      battle_ready: "[PARUOŠTA] Patikrinkite įrašus ir patvirtinkite transformacijos logiką į DAG.",
      battle_staged: "[ĮTRAUKTA] Logika įtraukta į DAG (patikrinimas atidedamas iki „Paleisti duomenų srautą“).",
      battle_engine: "VARIKLIS: {engine}",

      diag_title: "DUOMENŲ SRAUTO KOMPILIAVIMAS IR VYKDYMAS",
      diag_target: "TIKSLAS: {target}",
      diag_init: "[INIT] Paleidžiamas kompiliavimo variklis ({engine})...",
      diag_dag_resolving: "[DAG] Tikrinamos priklausomybės {count} paruoštiems mazgams...",
      diag_checking_node: "--- [MAZGAS {current}/{total}] Tikrinama „{name}“...",
      diag_pass: "  [TINKA] Logika sėkmingai sukompiliuota.",
      diag_fail: "  [KLAIDA] Užklausos logikoje aptikta klaida. Reikalingas skubus taisymas.",
      diag_issue: "    Problema: {explain}",
      diag_hotfix: "  [SKUBUS TAISYMAS] Sunaudotas -1 espreso (+60s bauda). Liko: {remaining}",
      diag_audit: "[AUDITAS] Pradinis kuras: {start} | Taisymai: -{mistakes} (+{penalty}s bauda) | Liko: {remaining}",
      diag_critical_oom: "[KRITINĖ KLAIDA] Trūksta atminties (OOM). Nepakanka espreso klaidoms ištaisyti.",
      status_failed_oom: "BŪSENA: NELAIMĖTA (OOM) | Espreso: 0",
      btn_abort_restart: "NUTRAUKTI IR PRADĖTI IŠ NAUJO",
      diag_deployed: "[ĮDIEGTA] Duomenų srauto patikrinimas baigtas, pasiektos tikslinės lentelės.",
      diag_stats: "[STATISTIKA] Ištaisyta klaidų: {mistakes} | Išsaugota espreso: {remaining}",
      status_deployed_success: "BŪSENA: SĖKMINGAI ĮDIEGTA | Išsaugota espreso: {remaining}",
      btn_claim_victory: "PASIEKTA PRODUKCIJOS PERGALĖ",
      btn_next_level: "KITAS DUOMENŲ LYGIS",
      btn_continue: "TĘSTI",

      lb_title: "PRODUKCIJOS \"PIPELINE\" LYDERIŲ LENTELĖ",
      lb_subtitle: "Greičiausi inžinieriai, sėkmingai įdiegę Bronzos, Sidabro ir Aukso sluoksnius į produkciją.",
      lb_th_rank: "#",
      lb_th_engineer: "INŽINIERIUS",
      lb_th_time: "LAIKAS",
      lb_th_espresso: "LIKĘS ESPRESO",
      lb_th_date: "DATA",
      lb_connecting: "Jungiamasi prie lyderių lentelės...",
      lb_empty: "Užbaigtų „pipeline“ dar nėra. Įdiekite Bronzos, Sidabro ir Aukso lygius, kad užimtumėte 1 vietą.",
      lb_cups: "{count} puod.",
      btn_clear_lb: "Išvalyti vietinius įrašus",
      btn_close: "UŽDARYTI",
      confirm_clear_lb: "Išvalyti vietinius lyderių lentelės įrašus?",

      game_over_title: "TRŪKSTA ATMINTIES (OOM)",
      game_over_desc: "Jūsų duomenų srautui pritrūko espreso bandant ištaisyti klaidingas užklausas. Pasiektas aklavietės taškas.",
      victory_title: "AUKSO SERTIFIKATAS PRODUKCIJOJE",
      victory_desc: "Visi 3 duomenų srauto sluoksniai (Bronzos PySpark, Sidabro analitinis SQL, Aukso Spark/Delta optimizavimas) sėkmingai įdiegti į produkciją.",
      victory_final_time: "Galutinis laikas:",
      victory_espresso_preserved: "Išsaugotas espreso:",
      victory_fuel_summary: "Kuras: Surinkta <strong>{scavenged}</strong> puod. - <strong>{mistakes}</strong> skubūs taisymai = liko <strong>{remaining}</strong>",
      victory_penalty_summary: "Espreso bauda: <strong>+{penalty}s</strong> ({mistakes} skubūs taisymai x 60s pridėta prie galutinio laiko)",
      victory_clean_deploy: "Švarus diegimas: Jokių skubių taisymų baudų.",
      callsign_label: "ĮVESKITE INŽINIERIAUS ŠAUKINĮ:",
      btn_submit_score: "PATEIKTI REZULTATĄ",
      btn_publishing: "SKELBIAMA...",
      btn_play_again: "ŽAISTI DAR KARTĄ",

      toast_score_submitted: "Rezultatas pateiktas į lyderių lentelę.",
      toast_entered_level: "Įeita į {name}. Rinkite espreso ir ruoškite užklausas.",
      toast_scavenged_espresso: "Paimtas espreso (+1 taisymo kuras, iš viso: {count}).",
      toast_task_already_staged: "Užduotis jau įtraukta į DAG ({staged}/{total}).",
      toast_all_tasks_staged: "Visos užduotys paruoštos. Paleiskite duomenų srautą kompiliavimui ir diegimui.",
      toast_staged_query: "Užklausa paruošta užduočiai „{name}“ ({staged}/{total}).",
      toast_stage_all_before_run: "Prieš paleidžiant duomenų srautą paruoškite visas {total} užduotis ({staged}/{total} paruošta)."
    },
    en: {
      doc_title: "PySpark Survivor: Data Lake Chronicles",
      hud_level: "LEVEL {num}",
      hud_engine: "Engine:",
      hud_timer_title: "Elapsed Time",
      hud_espresso: "Espresso:",
      hud_espresso_title: "Espresso available for Hotfixes",
      hud_staged: "Staged:",
      hud_staged_title: "Anomalies Staged into DAG",
      btn_run_pipeline: "RUN PIPELINE",
      btn_run_pipeline_title: "Validate and deploy all staged transformations",
      music_on: "Music: On",
      music_off: "Music: Off",
      music_title_on: "Turn background music off",
      music_title_off: "Turn background music on",
      btn_leaderboard: "Leaderboard",
      btn_leaderboard_title: "View Global Leaderboard",
      controls_hint: "Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> | Click adjacent tiles | Collect espresso cups to survive deployment bugs",
      lang_name: "EN",
      lang_title: "Switch language to Lithuanian (LT)",
      dpad_run: "RUN",

      menu_badge: "HOUSTON WE HAVE DATA",
      menu_title: "DATA PIPELINE SURVIVOR",
      menu_subtitle: "Zero to Production: A Data Engineering Roguelike",
      rule_levels: "<strong>3 Progressive Levels:</strong> Bronze (PySpark Ingestion) -> Silver (Analytical SQL) -> Gold (Spark/Delta Lake Optimization).",
      rule_espresso: "<strong>Espresso Survival:</strong> You start with <strong>0 Espressos</strong>. Collect coffee cups across the grid to fuel hotfixes when bugs occur.",
      rule_blind: "<strong>Blind Staging:</strong> Code correctness is validated only when executing <strong>RUN PIPELINE</strong>.",
      rule_penalties: "<strong>Hotfixes & Penalties:</strong> Each bug consumes <strong>1 Espresso</strong> and adds <strong>+60s penalty</strong> to your final time. Running out of coffee causes an OOM crash.",
      rule_leaderboard: "<strong>Leaderboard:</strong> The timer tracks deployment speed from launch to Gold certification.",
      btn_start_run: "START PIPELINE RUN",
      btn_view_leaderboard: "VIEW LEADERBOARD",

      anomaly_inspector_title: "ANOMALY INSPECTOR",
      anomaly_default_title: "ANOMALY",
      anomaly_default_desc: "Analyzing incoming partition telemetry...",
      skills_header: "Select transformation to stage into DAG:",
      battle_system_ready: "[SYSTEM] Ready for staging. Select the transformation to commit to the pipeline DAG.",
      battle_ready: "[READY] Inspect records and commit transformation logic to the DAG.",
      battle_staged: "[STAGED] Logic committed to DAG (validation deferred to 'Run Pipeline').",
      battle_engine: "ENGINE: {engine}",

      diag_title: "PIPELINE COMPILATION & EXECUTION",
      diag_target: "TARGET: {target}",
      diag_init: "[INIT] Booting compilation engine ({engine})...",
      diag_dag_resolving: "[DAG] Resolving dependencies for {count} staged nodes...",
      diag_checking_node: "--- [NODE {current}/{total}] Checking \"{name}\"...",
      diag_pass: "  [PASS] Logic compiled cleanly.",
      diag_fail: "  [FAIL] Bug detected in query logic. Hotfix required.",
      diag_issue: "    Issue: {explain}",
      diag_hotfix: "  [HOTFIX] -1 Espresso consumed (+60s penalty). Remaining: {remaining}",
      diag_audit: "[AUDIT] Starting Fuel: {start} | Hotfixes: -{mistakes} (+{penalty}s penalty) | Remaining: {remaining}",
      diag_critical_oom: "[CRITICAL] Out of memory (OOM). Insufficient Espresso to resolve bugs.",
      status_failed_oom: "STATUS: FAILED (OOM) | Espresso: 0",
      btn_abort_restart: "ABORT & RESTART",
      diag_deployed: "[DEPLOYED] Pipeline completed validation and reached target tables.",
      diag_stats: "[STATS] Bugs Hotfixed: {mistakes} | Surviving Espresso: {remaining}",
      status_deployed_success: "STATUS: DEPLOYED SUCCESS | Surviving Espresso: {remaining}",
      btn_claim_victory: "CLAIM PRODUCTION VICTORY",
      btn_next_level: "NEXT LEVEL PIPELINE",
      btn_continue: "CONTINUE",

      lb_title: "PRODUCTION PIPELINE LEADERBOARD",
      lb_subtitle: "Fastest engineers to deploy Bronze, Silver, and Gold layers to production.",
      lb_th_rank: "#",
      lb_th_engineer: "ENGINEER",
      lb_th_time: "TIME",
      lb_th_espresso: "REMAINING ESPRESSO",
      lb_th_date: "DATE",
      lb_connecting: "Connecting to leaderboard...",
      lb_empty: "No completed pipeline runs yet. Deploy Bronze, Silver, and Gold to claim #1.",
      lb_cups: "{count} cups",
      btn_clear_lb: "Clear Local Records",
      btn_close: "CLOSE",
      confirm_clear_lb: "Clear local leaderboard records?",

      game_over_title: "OUT OF MEMORY (OOM)",
      game_over_desc: "Your pipeline ran out of espresso while attempting to patch faulty queries. Critical deadlock reached.",
      victory_title: "GOLD PRODUCTION CERTIFIED",
      victory_desc: "All 3 data pipeline layers (Bronze PySpark, Silver Analytical SQL, Gold Spark/Delta Optimization) successfully deployed to production.",
      victory_final_time: "Final Time:",
      victory_espresso_preserved: "Espresso Preserved:",
      victory_fuel_summary: "Fuel: Scavenged <strong>{scavenged}</strong> cups - <strong>{mistakes}</strong> hotfixes = <strong>{remaining}</strong> remaining",
      victory_penalty_summary: "Espresso Penalty: <strong>+{penalty}s</strong> ({mistakes} hotfixes x 60s added to final time)",
      victory_clean_deploy: "Clean Deploy: Zero hotfix penalties.",
      callsign_label: "ENTER ENGINEER CALLSIGN:",
      btn_submit_score: "SUBMIT SCORE",
      btn_publishing: "PUBLISHING...",
      btn_play_again: "PLAY AGAIN",

      toast_score_submitted: "Score submitted to leaderboard.",
      toast_entered_level: "Entered {name}. Collect espresso and stage queries.",
      toast_scavenged_espresso: "Scavenged espresso (+1 hotfix fuel, total: {count}).",
      toast_task_already_staged: "Task already staged into DAG ({staged}/{total}).",
      toast_all_tasks_staged: "All tasks staged. Run pipeline to compile and deploy.",
      toast_staged_query: "Staged query for \"{name}\" ({staged}/{total}).",
      toast_stage_all_before_run: "Stage all {total} tasks before running the pipeline ({staged}/{total} staged)."
    }
  };

  const listeners = [];

  const i18n = {
    getLanguage() {
      return currentLang;
    },

    setLanguage(lang) {
      if (lang !== 'lt' && lang !== 'en') return;
      currentLang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {}

      document.documentElement.lang = lang;
      document.title = this.t('doc_title');

      this.applyDOM();
      listeners.forEach(fn => {
        try { fn(currentLang); } catch (err) { console.error(err); }
      });
    },

    toggleLanguage() {
      this.setLanguage(currentLang === 'lt' ? 'en' : 'lt');
    },

    onLanguageChange(callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
      }
    },

    t(key, params = {}) {
      const dict = DICT[currentLang] || DICT.lt;
      let text = dict[key] ?? DICT.en[key] ?? key;
      Object.keys(params).forEach(p => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
      });
      return text;
    },

    getLocalizedLevel(levelObj) {
      if (!levelObj) return levelObj;
      if (currentLang === 'lt' && window.TASK_TRANSLATIONS?.lt?.levels?.[levelObj.level]) {
        const trans = window.TASK_TRANSLATIONS.lt.levels[levelObj.level];
        return {
          ...levelObj,
          name: trans.name || levelObj.name,
          description: trans.description || levelObj.description
        };
      }
      return levelObj;
    },

    getLocalizedTask(task) {
      if (!task) return task;
      if (currentLang === 'lt' && window.TASK_TRANSLATIONS?.lt?.tasks?.[task.id]) {
        const t = window.TASK_TRANSLATIONS.lt.tasks[task.id];
        return {
          ...task,
          name: t.name || task.name,
          desc: t.desc || task.desc,
          skills: task.skills.map((skill, idx) => {
            const skillTrans = t.skills?.[idx];
            return {
              ...skill,
              label: skillTrans?.label || skill.label,
              explain: skillTrans?.explain || skill.explain
            };
          })
        };
      }
      return task;
    },

    applyDOM() {
      document.title = this.t('doc_title');

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = this.t(key);
      });

      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = this.t(key);
      });

      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = this.t(key);
      });

      document.querySelectorAll('[data-lang-label]').forEach(el => {
        el.textContent = this.t('lang_name');
        el.title = this.t('lang_title');
      });
    }
  };

  window.i18n = i18n;
})();
