const images = document.querySelectorAll(".hero-image");

let currentImage = 0;


function changeImage(){

    images[currentImage].classList.remove("active");

    currentImage++;

    if(currentImage >= images.length){
        currentImage = 0;
    }

    images[currentImage].classList.add("active");

}


setInterval(changeImage, 5000);