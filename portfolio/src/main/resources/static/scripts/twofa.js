document.addEventListener("DOMContentLoaded", function () {
    const twoFactorForm = document.querySelector(".twofa-form");

    if (!twoFactorForm) {
        return;
    }

    const inputs = Array.from(twoFactorForm.querySelectorAll(".input-fields input"));

    if (inputs.length === 0) {
        return;
    }

    inputs.forEach((input, index) => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");

            if (this.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Backspace" && this.value === "" && index > 0) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", function (event) {
            event.preventDefault();

            const pastedText = event.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            pastedText.split("").forEach((digit, digitIndex) => {
                if (inputs[digitIndex]) {
                    inputs[digitIndex].value = digit;
                }
            });

            const nextEmpty = inputs.find(input => input.value === "");
            if (nextEmpty) {
                nextEmpty.focus();
            } else {
                inputs[inputs.length - 1].focus();
            }
        });
    });

    inputs[0].focus();
});
