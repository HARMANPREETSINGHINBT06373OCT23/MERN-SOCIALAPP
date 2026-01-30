
export const getRecaptchaToken = () =>
  new Promise(res => {
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute("6LfJNk8sAAAAADyU2pLJ19b-2PAxTbq442HAMUdr", { action: "submit" }).then(res);
    });
  });
