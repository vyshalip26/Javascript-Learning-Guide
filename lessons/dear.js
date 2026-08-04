var e=document.getElementById('outputDiv');
var colors=['red', 'blue', 'green','orange', 'gold'];
var index=0;
e.addEventListener('click', function(){
    e.style.backgroundColor=colors[index];
    index++;
    if(index>=colors.length){
        index=0;
    }
}
);
