// Générateur de mot de passe
document.getElementById('generatePassword').addEventListener('click', function() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('passwordOutput').value = password;
});

// Testeur de mot de passe
document.getElementById('testPassword').addEventListener('click', function() {
    const password = document.getElementById('passwordTestInput').value;
    const strengthText = document.getElementById('passwordStrength');
    
    let strength = 'Faible';
    if (password.length >= 8) {
        if (/[A-Z]/.test(password) && /\d/.test(password) && /[!@#$%^&*()]/.test(password)) {
            strength = 'Fort';
        } else {
            strength = 'Moyenne';
        }
    }
    strengthText.textContent = `Force du mot de passe : ${strength}`;
});

// Convertisseur binaire/hexadécimal/décimal
document.getElementById('convertNumber').addEventListener('click', function() {
    const input = document.getElementById('inputNumber').value;
    const number = parseInt(input);
    
    if (!isNaN(number)) {
        document.getElementById('binaryOutput').textContent = `Binaire : ${number.toString(2)}`;
        document.getElementById('hexOutput').textContent = `Hexadécimal : ${number.toString(16).toUpperCase()}`;
        document.getElementById('decimalOutput').textContent = `Décimal : ${number}`;
    } else {
        alert('Veuillez entrer un nombre valide');
    }
});