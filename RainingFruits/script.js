document.getElementById('startButton').addEventListener('click', startGame);

function startGame() {
    document.getElementById('startButton').style.display = 'none';
    const gameArea = document.getElementById('gameArea');
    const basket = document.getElementById('basket');
    let appleInterval = 2000;
    let blackstoneInterval = 5000;

    function createFallingObject(type) {
        const object = document.createElement('img');
        object.src = type === 'apple' ? 'images/apple.png' : 'images/blackstone.png';
        object.className = type === 'apple' ? 'fruit' : 'blackstone';
        object.style.left = Math.random() * (window.innerWidth - 50) + 'px';
        gameArea.appendChild(object);

        let top = 0;
        const fallInterval = setInterval(() => {
            top += 2;
            object.style.top = top + 'px';
            if (top > window.innerHeight) {
                clearInterval(fallInterval);
                gameArea.removeChild(object);
            }
            if (isColliding(object, basket)) {
                clearInterval(fallInterval);
                gameArea.removeChild(object);
                if (type === 'apple') {
                    basket.src = 'images/fullbasket.jpg';
                    setTimeout(() => basket.src = 'images/emptybasket.jpg', 500);
                } else {
                    alert('Well played!');
                    location.reload();
                }
            }
        }, 20);
    }

    function isColliding(a, b) {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return !(
            aRect.bottom < bRect.top ||
            aRect.top > bRect.bottom ||
            aRect.right < bRect.left ||
            aRect.left > bRect.right
        );
    }

    function increaseDifficulty() {
        if (appleInterval > 500) appleInterval -= 100;
        if (blackstoneInterval > 2000) blackstoneInterval -= 200;
    }

    function moveBasket(event) {
        const basketRect = basket.getBoundingClientRect();
        if (event.key === 'ArrowLeft' && basketRect.left > 0) {
            basket.style.left = basketRect.left - 20 + 'px';
        } else if (event.key === 'ArrowRight' && basketRect.right < window.innerWidth) {
            basket.style.left = basketRect.left + 20 + 'px';
        }
    }

    function moveBasketWithMouse(event) {
        basket.style.left = event.clientX - basket.offsetWidth / 2 + 'px';
    }

    document.addEventListener('keydown', moveBasket);
    document.addEventListener('mousemove', moveBasketWithMouse);

    setInterval(() => createFallingObject('apple'), appleInterval);
    setInterval(() => createFallingObject('blackstone'), blackstoneInterval);
    setInterval(increaseDifficulty, 10000);
}