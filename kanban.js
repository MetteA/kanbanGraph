//Dette kode køres kun på klienten  
if (Meteor.isClient) {

  //Events funktioner til addStoryForm templaten
  Template.addStoryForm.events({
    //Når story formularen blivers sendt, køres følgende funktion
    'submit form': function(){
      //Fortæller browseren at den ikke skal opføre sig som den plejer, så den ikke sender brugeren vidre til næste side, som jeg ikke eksisterer
      event.preventDefault();
      //Opretter variabler som henter væriderne i indtastningsfelterne
      var storyTitleVar = event.target.storyTitle.value;
      var storyPointVar = event.target.storyPoint.value;
      
      //INDSÆTTER NYT DOKUMENT I STORY COLLECTION
      //Bruger de ovenstående variabler til at indsætte et nyt dokument i story collection'en. State er sat til Backlog, da alle stories skal starte i backlog
      StoryList.insert({
        title: storyTitleVar,
        point: storyPointVar,
        state: "Backlog"
      });
      //Ryder formularen når den er blevet sendt
      event.target.storyTitle.value = "";
      event.target.storyPoint.value = "";


      //OPDATERER BACKLOG DOKUMENTET I PROJECT COLLECTION'EN UD FRA OPLYSNINGERNE FRA DET NYE DOKUMENT I STORY COLLECTION'EN
      //Finder det dokument i project collection'en, som har key: Backlog
      var backlog = ProjectList.findOne({ key: "Backlog" });

      //--Find værdien af point i sidste objekt i values array'en
      //Sorterer values i backlog ud fra værdien i feltet time
      var backlogSorted = _.sortBy(backlog.values, function(value){
                    return value.time;
                });

      //Sætter backlogPoint til default at være 0
      var backlogPoint = 0 ;
      //Hvis variablen backlogSorted er længere end 0
      if(backlogSorted.length > 0){
        //så sættes variablen backlogPoint = backlogSorted, hvor rækkefølgen ændres, så den nyeste værdi kommer øverst, og feltet point fra det første array vælges
        backlogPoint = backlogSorted.reverse()[0].point;
      } //Så er værdien af point i sidste objekt i values array'en fundet

      //Udregner den nye værdie af point i backlog
      var updateStoryPoint = Number(backlogPoint) + Number(storyPointVar);

      //Tilføjer endnu et objekt til value med tid og den opdaterede antal point
      ProjectList.update({ _id: backlog._id}, {$addToSet: { values: {time: new Date(), point: updateStoryPoint} }} );
    

      //DE ANDRE DOKUMENTER I PROJECT COLLECTION'EN OPDATERES OGSÅ, SELVOM DER IKKE ER SKET EN ÆNDRING HOS DEM. DETTE ER FORDI NVD3 GRAFEN HAR BRUG FOR X-VÆRIDERNE HAR SAMME TIMESTAMP
      //Opdaterer Development
      var development = ProjectList.findOne({ key: "Development" });

      var developmentSorted = _.sortBy(development.values, function(value){
                    return value.time;
                });

      var developmentPoint = 0 ;
      if(developmentSorted.length > 0){
        developmentPoint = developmentSorted.reverse()[0].point;
      }

      ProjectList.update({ _id: development._id}, {$addToSet: { values: {time: new Date(), point: developmentPoint} }} );

      //Opdaterer Test
      var test = ProjectList.findOne({ key: "Test" });

      var testSorted = _.sortBy(test.values, function(value){
                    return value.time;
                });

      var testPoint = 0 ;
      if(testSorted.length > 0){
        testPoint = testSorted.reverse()[0].point;
      }

      ProjectList.update({ _id: test._id}, {$addToSet: { values: {time: new Date(), point: testPoint} }} );

      //Opdaterer Done
      var done = ProjectList.findOne({ key: "Done" });

      var doneSorted = _.sortBy(done.values, function(value){
                    return value.time;
                });

      var donePoint = 0 ;
      if(doneSorted.length > 0){
        donePoint = doneSorted.reverse()[0].point;
      }

      ProjectList.update({ _id: done._id}, {$addToSet: { values: {time: new Date(), point: donePoint} }} );
    }
  });

  //Hjælper funktioner til board templaten
  Template.board.helpers({
    'storyItem': function(){
      return StoryList.find(); //Finder og retunerer alle dokumenterne i story collection'en
    }
  });

  //Events funktioner til board templaten
  Template.board.events({
    //Funktion som køre når der klikkkes på et element med class'en .story
    'click .story': function(){
      //Gemmer _id, state og point af det valgte element i en session, således værdierne kan tilgåes igen senere
      var storyId = this._id;
      Session.set('selectedStory', storyId);
      var storyPoint = this.point;
      Session.set('selectedStoryPoint', storyPoint);
      var storyState = this.state;
      Session.set('selectedStoryState', storyState);
    },
    //Funktion som køre når værdien af drop down ændre sig
    'change form': function(){
      //Henter session selectedStory så vi har id'et på den story som skal ændres
      var selectedStory = Session.get('selectedStory');
      //Henter den nye værdi af state
      var updateStoryState = event.target.value;

      //Opdaterer story collectionen
      StoryList.update(selectedStory, {$set: {state: updateStoryState} });
    
      //OPDATERING AF POINT I DET DOKUMENT I PROJECT COLLECTION'EN HVIS KEY = DEN GAMLE STATE I STORY COLLECTION'EN
      //Henter sessionen som indeholder story'ens point
      var selectedStoryPoint = Session.get('selectedStoryPoint');

      //Henter sessionen som indeholder den gamle værdi af state
      var selectedStoryState = Session.get('selectedStoryState');

      //Finder det objekt i project collection'en som har key = gammel værdi af state
      var oldState = ProjectList.findOne({ key: selectedStoryState });

      //soter values i den gamle state dokument efter tid ved hjælp af underscore
      var sortedOld = _.sortBy(oldState.values, function(value){
                    return value.time;
                });
      //ændre rækkefølgen så den nyeste står øvers og hiver så fat i værien af point i det øverste array som er det nyest point
      oldPoint = sortedOld.reverse()[0].point;

      //Trækker den pågældende storys point fra det nuværedne point, og får derved det opdaterert antal point
      var updateOldStatePoint = Number(oldPoint) - Number(selectedStoryPoint);

      //Tilføjer et nyt objekt til key = den gamle state med den opdaterede point
      ProjectList.update({ _id: oldState._id}, {$addToSet: { values: {time: new Date(), point: updateOldStatePoint} }} );

    
      //OPDATERING AF POINT I DET DOKUMENT I PROJECT COLLECTION'EN HVIS KEY = DEN NYE STATE I STORY COLLECTION'EN
      var newState = ProjectList.findOne({ key: updateStoryState });

      var sortedState = _.sortBy(newState.values, function(value){ //Bruger underscore til at soterer data
                          return value.time;
                      });
      //Hvis der ikke er nogen fågående værdi i point sættes den til 0, ellers tages den nyeste værdi af point
      var newStateOldPoint = 0 ;
      if(sortedState.length > 0){
        newStateOldPoint = sortedState.reverse()[0].point;
      }

      //Pointene fra det tilføjede story lægges til de andre point
      var updateNewStatePoint = Number(newStateOldPoint) + Number(selectedStoryPoint);
      console.log(updateNewStatePoint);

      //Tilføjer et nyt objekt til key = den gamle state med den opdaterede point
      ProjectList.update({ _id: newState._id}, {$addToSet: { values: {time: new Date(), point: updateNewStatePoint} }} );


      //OPDATERER DE SIDSTE TO DOKUMENTER, DA TIMESTAMP SKAL VÆRE ENS
      //-- Finder de to ukendte keys som ikke bliver berørt når story'en bliver opdateret
      //Henter alt data fra Project collection'en
      var findKeys = ProjectList.find().fetch();
  
      //Filterer et dokument fra der allarede er opdateret, så der er tre tilbage
      var treeDoc = _.filter(findKeys, function(value){
        return value.key !== updateStoryState;
      });
      //Filterer det andet dokument fra der allerede er opdateret, så er der de to som stadig mangler at blive opdateret
      var twoDoc = _.filter(treeDoc, function(value){
        return value.key !== selectedStoryState;
      });

      //Det første ukendte dokument
      var unknownKey1 = twoDoc[0].key;
      //Det andet ukendte dokument
      var unknownKey2 = twoDoc[1].key;


      //-- Opdaterer ukendt key 1
      var Key1 = ProjectList.findOne({ key: unknownKey1 });

      var Key1Sorted = _.sortBy(Key1.values, function(value){
                    return value.time;
                });

      var Key1Point = 0 ;
      if(Key1Sorted.length > 0){
        Key1Point = Key1Sorted.reverse()[0].point;
      }

      ProjectList.update({ _id: Key1._id}, {$addToSet: { values: {time: new Date(), point: Key1Point} }} );

      //-- Opdaterer ukendt key 2
      var Key2 = ProjectList.findOne({ key: unknownKey2 });

      var Key2Sorted = _.sortBy(Key2.values, function(value){
                    return value.time;
                });

      var Key2Point = 0 ;
      if(Key2Sorted.length > 0){
        Key2Point = Key2Sorted.reverse()[0].point;
      }

      ProjectList.update({ _id: Key2._id}, {$addToSet: { values: {time: new Date(), point: Key2Point} }} );
    },
    //Gør det muligt at slette stories fra interfacet -- SKAL DETTE VÆRE MULIGT?
    'click .remove': function(){
      var selectedStory = Session.get('selectedStory');
      StoryList.remove(selectedStory);
    }
  });

  //OnRendered funktioner til graph templaten -- dette køres altså lige så snart siden inlæses
  Template.graph.onRendered(function(){
    //Genkøre funktionen når data ændres
    this.autorun(function(){
      //Henter dataen fra Project Collectionen
      var data = ProjectList.find({}).fetch();

      // Her er det nvd3, og som bygger oven op d3, som laver grafen
      nv.addGraph(function() {
          //Gøre brug af nvd3 allerede denineret stacked area chart
          var chart = nv.models.stackedAreaChart()
                        .width(1200)  //sætter bredden
                        .height(700)  //sætter højden
                        .useInteractiveGuideline(true)  //Tooltips which show all data points. Very nice!
                        .x(function(d) { return d.time; })  //Sætter x korrdinaten til at være værdien af time feltet
                        .y(function(d) { return d.point; })  //Sætter y korrdinaten til at være værdien af point feltet
                        .showControls(false) //Allow user to choose 'Stacked', 'Stream', 'Expanded' mode.
                        .showLegend(true) //Viser check-box til grafer - default: true
                        .duration(0); //Sætter duration til 0

          chart.xAxis.tickFormat(function(d) { return d3.time.format('%d/%m/%Y')(new Date(d)); }); //formater/styler x akse
          chart.yAxis.tickFormat(d3.format(',.0f')); //formater/styler y akse

          d3.select('#chart')
              //Finder og fetch'er dataen fra ProjectList i databasen og returnerer dette, så det kan vises i grafen via variablen data
              .datum(function(){ return data; })
              .call(chart);

          //Opdatere grafen når vinduet forandres
          nv.utils.windowResize(chart.update);
          //Retunere variablen chart, som giver grafen
          return chart;
      });
    });
  });

  //Hjælper funktion til templaten projectData, gør det muligt at execute in interfacen
  Template.ProjectData.helpers({
    'newProjectItem': function(){
    //bruger ProjectList variablen til at connecte til collectionen, finde indholdet og retunerer det til interfacet
     return ProjectList.find();
    }
  });
}

//Server side kode
if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

// opretter forbinnelse til collection'erne og gemmer denne forbindelse i variabler, så de kan bruges i koden
var StoryList = new Mongo.Collection('story');
var ProjectList = new Mongo.Collection('project');
