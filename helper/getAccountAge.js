function getAccountAge(curMonth,curYear,dateOfCreation){
    let docMonth=dateOfCreation.getMonth();
    let docYear=dateOfCreation.getFullYear();
    let yearDiff=curYear-docYear;
    let monthDiff=curMonth-docMonth;
    let diff=0;
    if(monthDiff>=0){
        diff=monthDiff+yearDiff*12;
    }else{
        yearDiff--;
        diff=Math.abs(monthDiff)+yearDiff*12;
    }
    return diff;
}

module.exports=getAccountAge