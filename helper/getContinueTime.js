function timeToSec(hour,min,sec){
    let total=0;
    total+=(hour*60*60)+(min*60)+sec;
    return total;
}

function secToTime(sec){
    let hour=Math.trunc(sec/(60*60));
    sec%=(60*60);
    let min=Math.trunc((sec/60));
    sec%=60;
    return {hour,min,sec};
}

function getValueToPercentage(val,totalVal){
    let percentage=(val/totalVal)*100;
    return percentage;
}

function getPercentageToValue(percentage,totalValue){
    let value=(percentage/100)*totalValue;
    return value;
}


function test(sh,sm,ss,hour,min,sec){
    console.log(`${sh}:${sm}:${ss}/${hour}:${min}:${sec}`);
    let cTime=timeToSec(sh,sm,ss);
    let tTime=timeToSec(hour,min,sec);
    let percentage=getValueToPercentage(cTime,tTime);
    console.log(percentage);
    let val=getPercentageToValue(percentage,tTime);
    console.log(val)
    let final=secToTime(val);
    console.log(final.hour,final.min,final.sec);
}

test(1,29,37,1,45,53);