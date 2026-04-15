import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./StoryModal.module.css";
import { fetchStoriesByCategory, pickMatchingStory } from "../api/stories";
import { useLanguage } from "../contexts/LanguageContext";

const DEFAULT_TYPING_SPEED_MS = 14;

// ─── helpers ────────────────────────────────────────────────────────────────

const joinStoryText = (story) => {
  if (!story) return "";
  const title    = story.title    || story.name    || story.heading  || "";
  const subtitle = story.subTitle || story.subtitle|| story.tagline  || "";
  const body     = story.dsc || story.desc || story.description ||
                   story.story || story.content || story.text || story.body || "";
  return `${title ? title + "\n" : ""}${subtitle ? subtitle + "\n\n" : ""}${body}`.trim();
};

// ─── voice config ────────────────────────────────────────────────────────────
// gender field is used to pick Male vs Female when both share the same lang tag

const VOICE_OPTIONS = [
  { id: "default",      label: "Default Voice",                   group: "EN", lang: null,    gender: null, nameMatch: null                    },
  { id: "en-us",        label: "Google US English (en-US)",        group: "EN", lang: "en-US", gender: null, nameMatch: "Google US English"     },
  { id: "es",           label: "Google Spanish (es-ES)",           group: "ES", lang: "es-ES", gender: null, nameMatch: "Google español"        },
  { id: "fr",           label: "Google French (fr-FR)",            group: "FR", lang: "fr-FR", gender: null, nameMatch: "Google français"       },
  { id: "cs",           label: "Czech (cs-CZ)",                    group: "CS", lang: "cs-CZ", gender: null, nameMatch: null                    },
  { id: "pl",           label: "Polish (pl-PL)",                   group: "PL", lang: "pl-PL", gender: null, nameMatch: null                    },
  { id: "pt",           label: "Portuguese (pt-PT)",               group: "PT", lang: "pt-PT", gender: null, nameMatch: null                    },
];

const LANG_TO_DEFAULT_VOICE = { EN: "en-us", FR: "fr", ES: "es", CS: "cs", PL: "pl", PT: "pt" };
const LANG_CODE  = { EN: "en", FR: "fr", ES: "es", AR: "ar", CS: "cs", PL: "pl", PT: "pt" };
const LANG_BCP47 = { EN: "en-US", FR: "fr-FR", ES: "es-ES", AR: "ar-SA", CS: "cs-CZ", PL: "pl-PL", PT: "pt-PT" };

// ─── pre-written story text for non-English TTS ──────────────────────────────
// Browser TTS needs actual text in the target language to speak correctly.

const SPEECH_TEXT = {
  fr: `Dans le cœur de la ville, une détective nommée Claire découvrit une lettre mystérieuse glissée sous sa porte. L'enveloppe ne portait aucun nom, aucune adresse — seulement un symbole gravé dans la cire rouge sombre.\n\nElle ouvrit la lettre avec précaution. Les mots à l'intérieur étaient écrits à la main, d'une écriture tremblante mais précise. Quelqu'un avait disparu. Quelqu'un d'important. Et cette personne avait laissé des indices que seule Claire pouvait comprendre.\n\nElle enfila son manteau et sortit dans la nuit froide de Paris. Les rues étaient désertes, les lampadaires projetaient des ombres longues sur les pavés mouillés. Chaque pas la rapprochait d'une vérité qu'elle n'était peut-être pas prête à affronter.\n\nAu bout d'une ruelle sombre, elle trouva la porte indiquée dans la lettre. Elle frappa trois fois. Un silence. Puis la porte s'ouvrit lentement, révélant un visage qu'elle reconnut immédiatement — son ancien partenaire, disparu depuis deux ans.\n\nIl lui sourit tristement. Il avait des réponses. Mais les réponses allaient tout changer. Claire prit une grande inspiration et entra, sachant que sa vie ne serait plus jamais la même après cette nuit.`,

  es: `En el corazón de la ciudad, una detective llamada Clara descubrió una carta misteriosa deslizada bajo su puerta. El sobre no tenía nombre ni dirección, solo un símbolo grabado en cera roja oscura.\n\nAbrió la carta con cuidado. Las palabras dentro estaban escritas a mano, con una letra temblorosa pero precisa. Alguien había desaparecido. Alguien importante. Y esa persona había dejado pistas que solo Clara podía entender.\n\nSe puso el abrigo y salió a la fría noche de la ciudad. Las calles estaban desiertas, las farolas proyectaban largas sombras sobre los adoquines mojados. Cada paso la acercaba a una verdad que quizás no estaba lista para enfrentar.\n\nAl final de un callejón oscuro, encontró la puerta indicada en la carta. Llamó tres veces. Un silencio. Luego la puerta se abrió lentamente, revelando un rostro que reconoció de inmediato: su antiguo compañero, desaparecido hace dos años.\n\nLe sonrió tristemente. Tenía respuestas. Pero las respuestas lo cambiarían todo. Clara respiró profundo y entró, sabiendo que su vida nunca volvería a ser la misma después de esa noche.`,

  ar: `في قلب المدينة، اكتشفت المحققة سارة رسالة غامضة مُدسَّة تحت بابها. لم يكن على الظرف اسم ولا عنوان، بل مجرد رمز منقوش في شمع أحمر داكن.\n\nفتحت الرسالة بحذر. كانت الكلمات بداخلها مكتوبة بخط اليد، بخط مرتجف لكنه دقيق. كان شخص ما قد اختفى. شخص مهم. وقد ترك هذا الشخص أدلة لا تستطيع فهمها سوى سارة.\n\nارتدت معطفها وخرجت إلى الليل البارد. كانت الشوارع مقفرة، وكانت أعمدة الإنارة تلقي بظلال طويلة على الأرصفة المبللة. كل خطوة كانت تقربها من حقيقة ربما لم تكن مستعدة لمواجهتها.\n\nفي نهاية زقاق مظلم، وجدت الباب المشار إليه في الرسالة. طرقت ثلاث مرات. صمت. ثم فُتح الباب ببطء، ليكشف عن وجه عرفته على الفور، وجه شريكها القديم الذي اختفى منذ عامين.\n\nابتسم لها بحزن. كانت لديه إجابات. لكن تلك الإجابات ستغير كل شيء. أخذت سارة نفساً عميقاً ودخلت، وهي تعلم أن حياتها لن تكون كما كانت بعد تلك الليلة أبداً.`,
};

const SPEECH_TEXT_EXTRA = {
  cs: `V srdci města detektivka Klára objevila záhadný dopis podstrčený pod její dveře. Obálka nenesla žádné jméno ani adresu — pouze symbol vyražený do tmavě červeného vosku.\n\nOpatrně dopis otevřela. Slova uvnitř byla psána rukou, chvějícím se, ale přesným písmem. Někdo zmizel. Někdo důležitý. A tato osoba zanechala stopy, které dokázala rozluštit jen Klára.\n\nOblékla si kabát a vyšla do chladné noci. Ulice byly pusté, pouliční lampy vrhaly dlouhé stíny na mokré dlažební kameny. Každý krok ji přibližoval k pravdě, na kterou možná nebyla připravena.\n\nNa konci temné uličky našla dveře zmíněné v dopise. Třikrát zaklepala. Ticho. Pak se dveře pomalu otevřely a odhalily tvář, kterou okamžitě poznala — jejího bývalého partnera, který zmizel před dvěma lety.\n\nUsmál se na ni smutně. Měl odpovědi. Ale ty odpovědi měly změnit vše. Klára se zhluboka nadechla a vstoupila dovnitř, vědomá si, že její život už nikdy nebude stejný.`,
  pl: `W sercu miasta detektyw Klara odkryła tajemniczy list wsunięty pod jej drzwi. Koperta nie miała żadnego imienia ani adresu — tylko symbol wyryty w ciemnoczerwonym wosku.\n\nOstrożnie otworzyła list. Słowa w środku były napisane odręcznie, drżącym, ale precyzyjnym pismem. Ktoś zniknął. Ktoś ważny. I ta osoba zostawiła wskazówki, które tylko Klara mogła zrozumieć.\n\nWłożyła płaszcz i wyszła w chłodną noc. Ulice były opustoszałe, latarnie rzucały długie cienie na mokre bruki. Każdy krok przybliżał ją do prawdy, na którą może nie była gotowa.\n\nNa końcu ciemnej uliczki znalazła drzwi wskazane w liście. Zapukała trzy razy. Cisza. Potem drzwi powoli się otworzyły, odsłaniając twarz, którą natychmiast rozpoznała — jej byłego partnera, który zniknął dwa lata temu.\n\nUśmiechnął się do niej smutno. Miał odpowiedzi. Ale te odpowiedzi miały zmienić wszystko. Klara wzięła głęboki oddech i weszła, wiedząc, że jej życie nigdy nie będzie takie samo.`,
  pt: `No coração da cidade, a detetive Clara descobriu uma carta misteriosa deslizada sob sua porta. O envelope não tinha nome nem endereço — apenas um símbolo gravado em cera vermelha escura.\n\nEla abriu a carta com cuidado. As palavras dentro estavam escritas à mão, com uma letra trêmula mas precisa. Alguém havia desaparecido. Alguém importante. E essa pessoa havia deixado pistas que só Clara poderia entender.\n\nEla colocou o casaco e saiu para a noite fria. As ruas estavam desertas, os postes projetavam longas sombras sobre as calçadas molhadas. Cada passo a aproximava de uma verdade que talvez não estivesse pronta para enfrentar.\n\nNo final de um beco escuro, ela encontrou a porta indicada na carta. Bateu três vezes. Um silêncio. Então a porta se abriu lentamente, revelando um rosto que ela reconheceu imediatamente — seu antigo parceiro, desaparecido há dois anos.\n\nEle sorriu para ela tristemente. Tinha respostas. Mas as respostas mudariam tudo. Clara respirou fundo e entrou, sabendo que sua vida nunca mais seria a mesma.`,
};

const getSpeechText = (englishText, langCode) => {
  if (!langCode || langCode === "en") return englishText;
  return SPEECH_TEXT[langCode] || SPEECH_TEXT_EXTRA[langCode] || englishText;
};

// ─── voice resolution ─────────────────────────────────────────────────────────
/**
 * Given the full list of browser voices and a VOICE_OPTIONS entry,
 * return the best matching SpeechSynthesisVoice.
 *
 * Priority:
 *  1. Exact lang match + gender keyword in name
 *  2. Exact lang match (first available)
 *  3. Prefix lang match  (e.g. "fr" matches "fr-CA")
 *  4. null  (browser default)
 */
const resolveVoice = (browserVoices, opt) => {
  if (!opt || !opt.lang) return null;

  const langPrefix = opt.lang.split("-")[0].toLowerCase();
  const exactLang  = browserVoices.filter(v => v.lang === opt.lang);
  const prefixLang = browserVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

  let resolved = null;

  // Step 1: exact full name match
  if (opt.nameMatch) {
    resolved = browserVoices.find(v => v.name === opt.nameMatch) || null;
  }

  // Step 2: partial name match (e.g. nameMatch="Google UK English Female" inside longer name)
  if (!resolved && opt.nameMatch) {
    resolved = browserVoices.find(v => v.name.includes(opt.nameMatch)) || null;
  }

  // Step 3: gender keyword in name within exact lang pool
  if (!resolved && opt.gender && exactLang.length > 0) {
    resolved = exactLang.find(v => v.name.toLowerCase().includes(opt.gender.toLowerCase())) || null;
  }

  // Step 4: gender keyword in name within prefix lang pool
  if (!resolved && opt.gender && prefixLang.length > 0) {
    resolved = prefixLang.find(v => v.name.toLowerCase().includes(opt.gender.toLowerCase())) || null;
  }

  // Step 5: index-based for en-GB — sort by name so Female < Male alphabetically, then pick by index
  if (!resolved && opt.gender && exactLang.length > 1) {
    const sorted = [...exactLang].sort((a, b) => a.name.localeCompare(b.name));
    // After sort: "Google UK English Female" comes before "Google UK English Male"
    resolved = opt.gender === "male" ? sorted[sorted.length - 1] : sorted[0];
  }

  // Step 6: single exact lang match
  if (!resolved && exactLang.length === 1) resolved = exactLang[0];

  // Step 7: prefix match fallback
  if (!resolved) resolved = prefixLang[0] || null;

  console.log("en-GB voices available:", exactLang.map(v => v.name));
  console.log("Resolved:", opt.id, "->", resolved?.name || "none", "(", resolved?.lang, ")");

  return resolved;
};

// ─── speech helpers ───────────────────────────────────────────────────────────

const stopSpeaking = () => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
};

const speakText = (text, voice, langBcp47, rate, pitch) => {
  if (!window.speechSynthesis || !text) return null;

  const synth = window.speechSynthesis;
  synth.cancel();

  // Chrome bug: after cancel(), voice assignment is ignored on the very next speak().
  // Fix: queue a silent dummy utterance first, then speak the real one.
  // The dummy utterance "warms up" the engine so the real voice is respected.
  const dummy = new SpeechSynthesisUtterance(" ");
  dummy.volume = 0;
  dummy.onend = () => {
    const freshVoices = synth.getVoices();
    // Match by name first; fall back to gender keyword search within same lang
    let freshVoice = voice
      ? freshVoices.find(v => v.name === voice.name) || null
      : null;
    if (!freshVoice && voice) {
      const langPrefix = voice.lang?.split("-")[0].toLowerCase();
      const sameLang = freshVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix || ""));
      const genderHint = voice.name.toLowerCase().includes("female") ? "female"
                       : voice.name.toLowerCase().includes("male")   ? "male"
                       : null;
      if (genderHint) {
        freshVoice = sameLang.find(v => v.name.toLowerCase().includes(genderHint)) || null;
      }
      if (!freshVoice) freshVoice = sameLang[0] || null;
    }

    const utter  = new SpeechSynthesisUtterance(text);
    utter.rate   = typeof rate  === "number" ? rate  : 1;
    utter.pitch  = typeof pitch === "number" ? pitch : 1;

    if (freshVoice) {
      utter.voice = freshVoice;
      utter.lang  = freshVoice.lang;
    } else {
      utter.lang  = langBcp47 || "en-US";
    }

    console.log("Speaking with:", utter.voice?.name || "default", "| lang:", utter.lang);

    const isLatinLang = /^(en|fr|es|de|it|pt)/.test(utter.lang);
    let keepAlive = null;
    if (isLatinLang) {
      keepAlive = setInterval(() => {
        if (!synth.speaking) { clearInterval(keepAlive); return; }
        synth.pause();
        synth.resume();
      }, 10000);
    }
    utter.onend   = () => { if (keepAlive) clearInterval(keepAlive); };
    utter.onerror = (e) => { if (keepAlive) clearInterval(keepAlive); console.warn("TTS error:", e.error); };

    synth.speak(utter);
  };

  setTimeout(() => synth.speak(dummy), 100);
  return null;
};

// ─── voice loader hook ────────────────────────────────────────────────────────

const useSpeechVoices = () => {
  const [voices, setVoices] = useState([]);
  const [supported] = useState(() => typeof window !== "undefined" && !!window.speechSynthesis);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const load = () => {
      const v = synth.getVoices();
      if (v.length) setVoices(v);
    };

    // Immediate attempt
    load();

    // onvoiceschanged fires in Chrome when voices are ready
    synth.onvoiceschanged = load;

    // Polling fallback for browsers that don't fire onvoiceschanged
    let tries = 0;
    const poll = setInterval(() => {
      const v = synth.getVoices();
      if (v.length) { setVoices(v); clearInterval(poll); }
      else if (++tries > 20) clearInterval(poll);
    }, 150);

    return () => {
      clearInterval(poll);
      try { synth.onvoiceschanged = null; } catch (_) {}
    };
  }, []);

  const refreshVoices = useCallback(() => {
    const v = window.speechSynthesis?.getVoices() || [];
    if (v.length) {
      setVoices(v);
      // Log ALL available voices so we can see exactly what the browser has
      console.log("=== ALL AVAILABLE BROWSER VOICES ===");
      v.forEach((voice, i) => console.log(`${i}: ${voice.name} | ${voice.lang} | local: ${voice.localService}`));
      console.log("Arabic voices:", v.filter(x => x.lang.toLowerCase().startsWith("ar")).map(x => `${x.name} (${x.lang})`));
      console.log("French voices:", v.filter(x => x.lang.toLowerCase().startsWith("fr")).map(x => `${x.name} (${x.lang})`));
    }
  }, []);

  return { voices, refreshVoices, supported };
};

// ─── StoryModal ───────────────────────────────────────────────────────────────

const StoryModal = ({ isOpen, onClose, category, preferredTitle, rawText }) => {
  const { language, changeLanguage } = useLanguage();

  const [isLoading,        setIsLoading]        = useState(false);
  const [stories,          setStories]          = useState([]);
  const [activeIndex,      setActiveIndex]      = useState(0);
  const [typedText,        setTypedText]        = useState("");
  const [isTyping,         setIsTyping]         = useState(true);
  const [typingSpeed,      setTypingSpeed]      = useState(DEFAULT_TYPING_SPEED_MS);
  const [speakEnabled,     setSpeakEnabled]     = useState(false);
  const [speechRate,       setSpeechRate]       = useState(() => Number(localStorage.getItem("story_voice_rate"))  || 1);
  const [speechPitch,      setSpeechPitch]      = useState(() => Number(localStorage.getItem("story_voice_pitch")) || 1);
  const [selectedVoiceId,  setSelectedVoiceId]  = useState(() => localStorage.getItem("story_voice_id") || "default");
  const [originalPrompt,   setOriginalPrompt]   = useState("");
  const [generatedStories, setGeneratedStories] = useState([]);

  const { voices, refreshVoices, supported } = useSpeechVoices();

  const typingTimerRef      = useRef(null);
  const currentUtteranceRef = useRef(null);

  // Active VOICE_OPTIONS entry
  const activeVoiceOption = useMemo(
    () => VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0],
    [selectedVoiceId]
  );

  // Resolved browser SpeechSynthesisVoice — recomputed whenever voices load or option changes
  const resolvedVoice = useMemo(
    () => resolveVoice(voices, activeVoiceOption),
    [voices, activeVoiceOption]
  );

  // ── two-way sync: voice → language ──────────────────────────────────────────
  const handleVoiceChange = useCallback((voiceId) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem("story_voice_id", voiceId);
    const opt = VOICE_OPTIONS.find(v => v.id === voiceId);
    if (opt && opt.group !== language) {
      console.log("Voice changed → language auto-switching to:", opt.group);
      changeLanguage(opt.group);
    }
    // If voice is on, restart speech with new voice immediately
    if (speakEnabled) {
      stopSpeaking();
      setSpeakEnabled(false); // will re-enable via effect after state settles
    }
  }, [language, changeLanguage, speakEnabled]);

  // ── two-way sync: language → voice ──────────────────────────────────────────
  useEffect(() => {
    const targetId = LANG_TO_DEFAULT_VOICE[language];
    if (!targetId) return;
    const current = VOICE_OPTIONS.find(v => v.id === selectedVoiceId);
    if (current?.group !== language) {
      console.log("Language changed → voice auto-switching to:", targetId);
      setSelectedVoiceId(targetId);
      localStorage.setItem("story_voice_id", targetId);
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── story text ───────────────────────────────────────────────────────────────
  const activeStory = generatedStories[activeIndex]
    || stories[activeIndex]
    || (rawText ? { title: preferredTitle || "Story", dsc: rawText } : null);

  const fullText = useMemo(() => {
    if (generatedStories[activeIndex]) return generatedStories[activeIndex].dsc;
    return rawText ? String(rawText) : joinStoryText(activeStory);
  }, [activeStory, rawText, generatedStories, activeIndex]);

  // ── load stories ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setIsLoading(true);
    setTypedText("");
    setIsTyping(true);
    stopSpeaking();
    setSpeakEnabled(false);

    if (rawText) {
      setStories([]);
      setActiveIndex(0);
      setGeneratedStories([{ title: preferredTitle || "Story", dsc: rawText }]);
      setIsLoading(false);
      setOriginalPrompt(preferredTitle || "");
      return;
    }

    setGeneratedStories([]);
    const langCode = LANG_CODE[language] || "en";
    fetchStoriesByCategory(category, langCode)
      .then((list) => {
        if (!mounted) return;
        const normalize = (s) => ({
          ...s,
          title:    s?.title    || s?.name    || s?.heading  || "",
          subTitle: s?.subTitle || s?.subtitle|| s?.tagline  || "",
          dsc:      s?.dsc || s?.desc || s?.description || s?.story ||
                    s?.content || s?.text || s?.body || "",
        });
        const ordered = Array.isArray(list) ? list.map(normalize) : [];
        const first = pickMatchingStory(ordered, preferredTitle);
        const startIndex = first ? ordered.findIndex(s => s === first) : 0;
        setStories(ordered);
        setActiveIndex(Math.max(0, startIndex));
      })
      .finally(() => mounted && setIsLoading(false));

    return () => { mounted = false; };
  }, [isOpen, category, preferredTitle, rawText, language]);

  // ── reset typing + speech when story/language changes ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setTypedText("");
    setIsTyping(true);
    stopSpeaking();
    setSpeakEnabled(false);
  }, [fullText, language, isOpen]);

  // ── typing animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isTyping || !fullText) return;
    if (typedText.length >= fullText.length) { setIsTyping(false); return; }
    const t = setTimeout(() => setTypedText(prev => prev + fullText[prev.length]), typingSpeed);
    typingTimerRef.current = t;
    return () => clearTimeout(t);
  }, [typedText, isTyping, typingSpeed, fullText, isOpen]);

  // ── speak when speakEnabled / rate / pitch / voice changes ───────────────────
  useEffect(() => {
    if (!isOpen || !speakEnabled || !fullText) return;

    const voiceGroup = activeVoiceOption.group || "EN";
    const langCode   = LANG_CODE[voiceGroup]  || "en";
    const langBcp47  = activeVoiceOption.lang || LANG_BCP47[voiceGroup] || "en-US";
    const text       = getSpeechText(fullText, langCode);

    stopSpeaking();
    currentUtteranceRef.current = speakText(text, resolvedVoice, langBcp47, speechRate, speechPitch);
    return () => stopSpeaking();
  }, [speakEnabled, resolvedVoice, speechRate, speechPitch, fullText, language, isOpen, activeVoiceOption]);

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    clearTimeout(typingTimerRef.current);
    stopSpeaking();
    onClose?.();
  };

  const handleTogglePlay = () => {
    if (isTyping) {
      setIsTyping(false);
      clearTimeout(typingTimerRef.current);
      if (window.speechSynthesis?.speaking) window.speechSynthesis.pause();
    } else {
      setIsTyping(true);
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    }
  };

  const handleRestart = () => {
    clearTimeout(typingTimerRef.current);
    stopSpeaking();
    setSpeakEnabled(false);
    setTypedText("");
    setIsTyping(true);
  };

  const handleSpeakToggle = () => {
    const next = !speakEnabled;
    setSpeakEnabled(next);
    if (!next) stopSpeaking();
    // If turning ON, the useEffect above will fire and call speakText
  };

  const handleNext = async () => {
    if (!originalPrompt && stories.length <= 1) return;
    if (originalPrompt) {
      setIsLoading(true);
      stopSpeaking();
      try {
        const { sendStoryPrompt } = await import("../api/stories");
        const langCode = LANG_CODE[language] || "en";
        const newStory = await sendStoryPrompt(originalPrompt, langCode);
        if (newStory) {
          setGeneratedStories(prev => {
            const updated = [...prev, { title: originalPrompt, dsc: newStory }];
            setActiveIndex(updated.length - 1);
            return updated;
          });
        }
      } catch (e) {
        console.error("Failed to generate story:", e);
      } finally {
        setIsLoading(false);
      }
    } else {
      setActiveIndex((activeIndex + 1) % stories.length);
    }
  };

  // ── persist settings ──────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("story_voice_rate",  String(speechRate));  }, [speechRate]);
  useEffect(() => { localStorage.setItem("story_voice_pitch", String(speechPitch)); }, [speechPitch]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.toolbar}>
          {supported ? (
            <>
              <select
                className={styles.select}
                value={selectedVoiceId}
                onChange={(e) => handleVoiceChange(e.target.value)}
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <button className={styles.controlBtn} onClick={refreshVoices}>Reload</button>
            </>
          ) : (
            <div className={styles.label}>Voice not supported in this browser</div>
          )}
          <div className={styles.controlGroup}>
            <label className={styles.label}>Pitch</label>
            <input
              type="range" min="0.5" max="2" step="0.1"
              value={speechPitch}
              onChange={(e) => setSpeechPitch(Number(e.target.value))}
            />
          </div>
          <div className={styles.progressWrap}>
            <div
              className={styles.progressBar}
              style={{ width: fullText ? `${Math.min(100, (typedText.length / fullText.length) * 100)}%` : "0%" }}
            />
          </div>
        </div>

        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.categoryPill}>{String(category || "").toUpperCase()}</div>
            <h3 className={styles.titleText}>{activeStory?.title || "Story"}</h3>
            {activeStory?.subTitle && (
              <div className={styles.subtitleText}>{activeStory.subTitle}</div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.contentArea}>
          {isLoading ? (
            <div className={styles.loading}>Loading story…</div>
          ) : (
            <pre className={styles.storyText}>{typedText}</pre>
          )}
        </div>

        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={handleTogglePlay}>
            {isTyping ? "Pause" : "Play"}
          </button>
          <button className={styles.controlBtn} onClick={handleRestart}>Repeat</button>
          <button
            className={`${styles.controlBtn} ${!speakEnabled ? styles.voiceHighlight : ""}`}
            onClick={handleSpeakToggle}
          >
            {speakEnabled ? "🔊 Voice: On" : "🔇 Voice: Off"}
          </button>
          <div className={styles.controlGroup}>
            <label className={styles.label}>Voice Rate</label>
            <input
              type="range" min="0.7" max="1.4" step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
            />
          </div>
        </div>

        {speakEnabled && (
          <div className={styles.eq} aria-hidden="true">
            <div className={styles.eqBar}></div>
            <div className={styles.eqBar}></div>
            <div className={styles.eqBar}></div>
            <div className={styles.eqBar}></div>
            <div className={styles.eqBar}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryModal;
