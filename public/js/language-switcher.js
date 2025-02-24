$(document).ready(function() {
    const switchLangButton = $('#switch-lang');
    const contentEl = $('#content-el');
    const contentEn = $('#content-en');

    function setLanguage(language) {
        // console.log('Current language:', language); // Log the current language

        if (language === 'en') {
            contentEl.hide();
            contentEn.show();
            switchLangButton.text('Ελληνικά');
            $('html').attr('lang', 'en');
        } else {
            contentEl.show();
            contentEn.hide();
            switchLangButton.text('English');
            $('html').attr('lang', 'el');
        }
    }


    function toggleLanguage() {
        const currentLanguage = localStorage.getItem('language') || 'el';
        const newLanguage = currentLanguage === 'el' ? 'en' : 'el';
        localStorage.setItem('language', newLanguage);
        setLanguage(newLanguage);
    }

    switchLangButton.on('click', toggleLanguage);

    const savedLanguage = localStorage.getItem('language') || 'el';
    setLanguage(savedLanguage);
});
