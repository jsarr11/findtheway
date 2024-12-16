// Submit handling for both forms
$('#loginForm, #loginFormEn').on('submit', async function(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    // Determine which errorMessage ID to use based on which form is submitted
    const errorMessageId = (form.id === 'loginForm') ? '#errorMessage-el' : '#errorMessage-en';
    const errorMessage = $(errorMessageId);

    errorMessage.html('');
    errorMessage.hide();

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: new URLSearchParams(formData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            errorMessage.html(errorText);
            errorMessage.show();
        } else {
            const lang = formData.get('lang') || 'el';
            window.location.href = `/user-page`;
        }
    } catch (err) {
        console.error('Error submitting form', err);
        const lang = formData.get('lang') || 'el';
        errorMessage.html(lang === 'en'
            ? 'An error occurred while submitting the form. Please try again.'
            : 'Παρουσιάστηκε σφάλμα κατά την υποβολή της φόρμας. Παρακαλώ προσπαθήστε ξανά.');
        errorMessage.show();
    }
});