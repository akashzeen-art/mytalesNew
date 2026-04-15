import React from "react";
import styles from "./TermsOfService.module.css";
import { useLanguage } from "../contexts/LanguageContext";
import { termsTranslations } from "../translations/termsTranslations";

const TermsOfService = () => {
  const { language } = useLanguage();
  const t = termsTranslations[language] || termsTranslations.EN;

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.card}>
        <h1 className={styles.title}>{t.title}</h1>

        <h2 className={styles.subtitle}>{t.subtitle}</h2>
        <p className={styles.description}>{t.description}</p>

        <ul className={styles.termsList}>
          {t.terms.map((term, i) => (
            <li key={i}>{term}</li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default TermsOfService;
