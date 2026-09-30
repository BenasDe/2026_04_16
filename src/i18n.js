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
      hud_fuel: "{fuelName}:",
      hud_fuel_title: "{fuelName} klaidų taisymui",
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
      controls_hint: "Judėjimas: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> arba <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> | Spustelėkite gretimus laukelius | Rinkite {fuelPickups} klaidų taisymui",
      lang_name: "LT",
      lang_title: "Pakeisti kalbą į anglų (EN)",
      dpad_run: "LEISTI",

      menu_badge: "HOUSTON WE HAVE DATA",
      menu_title: "PIPELINE",
      menu_subtitle: "Nuo nulio iki produkcijos: Duomenų inžinerijos „Roguelike“",
      rule_levels: "<strong>Lygių: {levelCount}.</strong> {levelNames}.",
      rule_fuel: "<strong>Kuras klaidų taisymui:</strong> Pradedate su <strong>0 {fuelUnits}</strong>. Rinkite {fuelPickups} žemėlapyje, kad galėtumėte išgyventi radus klaidas.",
      rule_blind: "<strong>Paruošimas:</strong> Kodo patikrinamas vyksta tik vykdant <strong>PALEISTI PIPELINE</strong>.",
      rule_penalties: "<strong>Taisymai ir baudos:</strong> Kiekviena klaida sunaudoja <strong>1 {fuelUnit}</strong> ir prideda <strong>+60s baudą</strong> prie galutinio laiko. Kai klaidai ištaisyti nepakanka kuro, Game Over.",
      rule_leaderboard: "<strong>Lyderių lentelė:</strong> Laikmatis fiksuoja laiką nuo paleidimo iki paskutinio lygio užbaigimo.",
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
      diag_hotfix: "  [SKUBUS TAISYMAS] Sunaudota -1 {fuelUnit} (+60s bauda). Liko: {remaining}",
      diag_audit: "[AUDITAS] Pradinis kuras: {start} | Taisymai: -{mistakes} (+{penalty}s bauda) | Liko: {remaining}",
      diag_critical_oom: "[KRITINĖ KLAIDA] Trūksta atminties (OOM). Nepakanka {fuelGenitive} klaidoms ištaisyti.",
      status_failed_oom: "BŪSENA: NELAIMĖTA (OOM) | {fuelName}: 0",
      btn_abort_restart: "NUTRAUKTI IR PRADĖTI IŠ NAUJO",
      diag_deployed: "[ĮDIEGTA] Duomenų srauto patikrinimas baigtas, pasiektos tikslinės lentelės.",
      diag_stats: "[STATISTIKA] Ištaisyta klaidų: {mistakes} | Liko {fuelGenitive}: {remaining}",
      status_deployed_success: "BŪSENA: SĖKMINGAI ĮDIEGTA | Liko {fuelGenitive}: {remaining}",
      btn_claim_victory: "PASIEKTA PRODUKCIJOS PERGALĖ",
      btn_next_level: "KITAS DUOMENŲ LYGIS",
      btn_continue: "TĘSTI",

      lb_title: "PRODUKCIJOS \"PIPELINE\" LYDERIŲ LENTELĖ",
      lb_subtitle: "Greičiausi inžinieriai, sėkmingai įdiegę visus kampanijos lygius į produkciją.",
      lb_th_rank: "#",
      lb_th_engineer: "INŽINIERIUS",
      lb_th_time: "LAIKAS",
      lb_th_fuel: "{fuelName} LIKUTIS",
      lb_th_date: "DATA",
      lb_connecting: "Jungiamasi prie lyderių lentelės...",
      lb_empty: "Užbaigtų „pipeline“ dar nėra. Įdiekite visus kampanijos lygius, kad užimtumėte 1 vietą.",
      lb_fuel_units: "{count} {fuelCountUnit}",
      btn_clear_lb: "Išvalyti vietinius įrašus",
      btn_close: "UŽDARYTI",
      confirm_clear_lb: "Išvalyti vietinius lyderių lentelės įrašus?",

      game_over_title: "TRŪKSTA ATMINTIES (OOM)",
      game_over_desc: "Jūsų duomenų srautui pritrūko {fuelGenitive} bandant ištaisyti klaidingas užklausas. Pasiektas aklavietės taškas.",
      victory_title: "DUOMENŲ SRAUTAS ĮDIEGTAS Į PRODUKCIJĄ",
      victory_desc: "Visi duomenų srauto lygiai ({levelCount}) sėkmingai įdiegti į produkciją.",
      victory_final_time: "Galutinis laikas:",
      victory_fuel_preserved: "Liko {fuelGenitive}:",
      victory_fuel_summary: "Kuras: Surinkta <strong>{scavenged}</strong> {fuelUnits} - <strong>{mistakes}</strong> skubūs taisymai = liko <strong>{remaining}</strong>",
      victory_penalty_summary: "{fuelName} bauda: <strong>+{penalty}s</strong> ({mistakes} skubūs taisymai x 60s pridėta prie galutinio laiko)",
      victory_clean_deploy: "Švarus diegimas: Jokių skubių taisymų baudų.",
      callsign_label: "ĮVESKITE INŽINIERIAUS ŠAUKINĮ:",
      btn_submit_score: "PATEIKTI REZULTATĄ",
      btn_publishing: "SKELBIAMA...",
      btn_play_again: "ŽAISTI DAR KARTĄ",

      toast_score_submitted: "Rezultatas pateiktas į lyderių lentelę.",
      toast_entered_level: "Įeita į {name}. Rinkite {fuelPickups} ir ruoškite užklausas.",
      toast_scavenged_fuel: "Paimtas kuras: {fuelName} (+1 taisymo kuras, iš viso: {count}).",
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
      hud_fuel: "{fuelName}:",
      hud_fuel_title: "{fuelName} available for Hotfixes",
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
      controls_hint: "Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> | Click adjacent tiles | Collect {fuelPickups} to survive deployment bugs",
      lang_name: "EN",
      lang_title: "Switch language to Lithuanian (LT)",
      dpad_run: "RUN",

      menu_badge: "HOUSTON WE HAVE DATA",
      menu_title: "DATA PIPELINE SURVIVOR",
      menu_subtitle: "Zero to Production: A Data Engineering Roguelike",
      rule_levels: "<strong>Levels: {levelCount}.</strong> {levelNames}.",
      rule_fuel: "<strong>{fuelName} Survival:</strong> You start with <strong>0 {fuelUnits}</strong>. Collect {fuelPickups} across the grid to fuel hotfixes when bugs occur.",
      rule_blind: "<strong>Blind Staging:</strong> Code correctness is validated only when executing <strong>RUN PIPELINE</strong>.",
      rule_penalties: "<strong>Hotfixes & Penalties:</strong> Each bug consumes <strong>1 {fuelUnit}</strong> and adds <strong>+60s penalty</strong> to your final time. Insufficient fuel for a hotfix causes an OOM crash.",
      rule_leaderboard: "<strong>Leaderboard:</strong> The timer tracks deployment speed from launch to completion of the final level.",
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
      diag_hotfix: "  [HOTFIX] -1 {fuelUnit} consumed (+60s penalty). Remaining: {remaining}",
      diag_audit: "[AUDIT] Starting Fuel: {start} | Hotfixes: -{mistakes} (+{penalty}s penalty) | Remaining: {remaining}",
      diag_critical_oom: "[CRITICAL] Out of memory (OOM). Insufficient {fuelGenitive} to resolve bugs.",
      status_failed_oom: "STATUS: FAILED (OOM) | {fuelName}: 0",
      btn_abort_restart: "ABORT & RESTART",
      diag_deployed: "[DEPLOYED] Pipeline completed validation and reached target tables.",
      diag_stats: "[STATS] Bugs Hotfixed: {mistakes} | Remaining {fuelName}: {remaining}",
      status_deployed_success: "STATUS: DEPLOYED SUCCESS | Remaining {fuelName}: {remaining}",
      btn_claim_victory: "CLAIM PRODUCTION VICTORY",
      btn_next_level: "NEXT LEVEL PIPELINE",
      btn_continue: "CONTINUE",

      lb_title: "PRODUCTION PIPELINE LEADERBOARD",
      lb_subtitle: "Fastest engineers to deploy every level in the campaign to production.",
      lb_th_rank: "#",
      lb_th_engineer: "ENGINEER",
      lb_th_time: "TIME",
      lb_th_fuel: "REMAINING {fuelName}",
      lb_th_date: "DATE",
      lb_connecting: "Connecting to leaderboard...",
      lb_empty: "No completed pipeline runs yet. Deploy every level in the campaign to claim #1.",
      lb_fuel_units: "{count} {fuelCountUnit}",
      btn_clear_lb: "Clear Local Records",
      btn_close: "CLOSE",
      confirm_clear_lb: "Clear local leaderboard records?",

      game_over_title: "OUT OF MEMORY (OOM)",
      game_over_desc: "Your pipeline ran out of {fuelGenitive} while attempting to patch faulty queries. Critical deadlock reached.",
      victory_title: "PIPELINE PRODUCTION CERTIFIED",
      victory_desc: "All {levelCount} pipeline levels successfully deployed to production.",
      victory_final_time: "Final Time:",
      victory_fuel_preserved: "{fuelName} Preserved:",
      victory_fuel_summary: "Fuel: Scavenged <strong>{scavenged}</strong> {fuelUnits} - <strong>{mistakes}</strong> hotfixes = <strong>{remaining}</strong> remaining",
      victory_penalty_summary: "{fuelName} Penalty: <strong>+{penalty}s</strong> ({mistakes} hotfixes x 60s added to final time)",
      victory_clean_deploy: "Clean Deploy: Zero hotfix penalties.",
      callsign_label: "ENTER ENGINEER CALLSIGN:",
      btn_submit_score: "SUBMIT SCORE",
      btn_publishing: "PUBLISHING...",
      btn_play_again: "PLAY AGAIN",

      toast_score_submitted: "Score submitted to leaderboard.",
      toast_entered_level: "Entered {name}. Collect {fuelPickups} and stage queries.",
      toast_scavenged_fuel: "Scavenged {fuelGenitive} (+1 hotfix fuel, total: {count}).",
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
      const levels = window.GAME_LEVELS || [];
      const escapeHTML = value => value.replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[char]);
      const values = {
        ...window.GameFuel.tokens(currentLang, params.count),
        levelCount: levels.length,
        levelNames: levels.map(level => escapeHTML(this.getLocalizedLevel(level).name)).join(' → '),
        ...params
      };
      Object.keys(values).forEach(p => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), () => String(values[p]));
      });
      return text;
    },

    getLocalizedLevel(levelObj) {
      if (!levelObj) return levelObj;
      if (currentLang === window.GAME_CONTENT_PACK.defaultLanguage) return levelObj;
      const trans = levelObj.translations[currentLang];
      return {...levelObj, name: trans.name, description: trans.description};
    },

    getLocalizedTask(task) {
      if (!task) return task;
      if (currentLang === window.GAME_CONTENT_PACK.defaultLanguage) return task;
      const trans = task.translations[currentLang];
      return {
        ...task,
        name: trans.name,
        desc: trans.desc,
        skills: task.skills.map(skill => {
          const skillTrans = trans.skills[skill.id];
          return {...skill, label: skillTrans.label, explain: skillTrans.explain};
        })
      };
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
