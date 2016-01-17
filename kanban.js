ProjectList = new Mongo.Collection('project');
StoryList = new Mongo.Collection('story');
  
if (Meteor.isClient) {
  Template.addStoryForm.events({
    'submit form': function(){
      event.preventDefault();
      
      var storyTitleVar = event.target.storyTitle.value;
      var storyPointVar = event.target.storyPoint.value;
      
      //INDSÆTTER NYT DOKUMENT I STORY COLLECTION
      StoryList.insert({
        title: storyTitleVar,
        point: storyPointVar,
        state: "Backlog"
      });
  
      event.target.storyTitle.value = "";
      event.target.storyPoint.value = "";

      //OPDATERER BACKLOG DOKUMENTET I PROJECT COLLECTION'EN UD FRA OPLYSNINGERNE FRA DET NYE DOKUMENT I STORY COLLECTION'EN
      var backlog = ProjectList.findOne({ key: "Backlog" });

      var backlogSorted = _.sortBy(backlog.values, function(value){
                    return value.time;
                });

      var backlogPoint = 0 ;
      if(backlogSorted.length > 0){
        backlogPoint = backlogSorted.reverse()[0].point;
      }

      var updateStoryPoint = Number(backlogPoint) + Number(storyPointVar);

      ProjectList.update({ _id: backlog._id}, {$addToSet: { values: {time: new Date(), point: updateStoryPoint} }} );
    

      //OPDATERER DE ANDRE DOKUMENTER I PROJECT COLLECTION'EN 
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

  Template.board.helpers({
    'storyItem': function(){
      return StoryList.find();
    }
  });

  Template.board.events({
    'click .story': function(){
      var storyId = this._id;
      Session.set('selectedStory', storyId);
      var storyPoint = this.point;
      Session.set('selectedStoryPoint', storyPoint);
      var storyState = this.state;
      Session.set('selectedStoryState', storyState);
    },
    'change form': function(){
      var selectedStory = Session.get('selectedStory');
      var updateStoryState = event.target.value;

      StoryList.update(selectedStory, {$set: {state: updateStoryState} });
    
      //OPDATERING AF POINT I DET DOKUMENT I PROJECT COLLECTION'EN HVIS KEY = DEN GAMLE STATE I STORY COLLECTION'EN
      var selectedStoryPoint = Session.get('selectedStoryPoint');
      var selectedStoryState = Session.get('selectedStoryState');

      var oldState = ProjectList.findOne({ key: selectedStoryState });

      var sortedOld = _.sortBy(oldState.values, function(value){
                    return value.time;
                });
      oldPoint = sortedOld.reverse()[0].point;

      var updateOldStatePoint = Number(oldPoint) - Number(selectedStoryPoint);

      ProjectList.update({ _id: oldState._id}, {$addToSet: { values: {time: new Date(), point: updateOldStatePoint} }} );

    
      //OPDATERING AF POINT I DET DOKUMENT I PROJECT COLLECTION'EN HVIS KEY = DEN NYE STATE I STORY COLLECTION'EN
      var newState = ProjectList.findOne({ key: updateStoryState });

      var sortedState = _.sortBy(newState.values, function(value){ 
                          return value.time;
                      });
      
      var newStateOldPoint = 0 ;
      if(sortedState.length > 0){
        newStateOldPoint = sortedState.reverse()[0].point;
      }

      var updateNewStatePoint = Number(newStateOldPoint) + Number(selectedStoryPoint);

      ProjectList.update({ _id: newState._id}, {$addToSet: { values: {time: new Date(), point: updateNewStatePoint} }} );


      //OPDATERER DE SIDSTE TO DOKUMENTER, DA TIMESTAMP SKAL VÆRE ENS
      var findKeys = ProjectList.find().fetch();
  
      var treeDoc = _.filter(findKeys, function(value){
        return value.key !== updateStoryState;
      });
      
      var twoDoc = _.filter(treeDoc, function(value){
        return value.key !== selectedStoryState;
      });

      var unknownKey1 = twoDoc[0].key;
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
    }
  });

  Template.ProjectData.helpers({
    'newProjectItem': function(){
     return ProjectList.find();
    }
  });

  Template.graph.onRendered(function(){
    this.autorun(function(){

      var data = ProjectList.find({}).fetch();

      nv.addGraph(function() {
          var chart = nv.models.stackedAreaChart()
                        .useInteractiveGuideline(true)
                        .x(function(d) { return d.time; })
                        .y(function(d) { return d.point; })
                        .showControls(false)
                        .showLegend(true)
                        .duration(0);

          chart.xAxis.tickFormat(function(d) { return d3.time.format('%d/%m/%Y')(new Date(d)); });
          chart.yAxis.tickFormat(d3.format('f'));

          d3.select('#chart')
              .datum(function(){ return data; })
              .call(chart);

          nv.utils.windowResize(chart.update);
          return chart;
      });
    });
  });
}

//Server side kode
if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}