angular.module('boards', ['services'])

.controller('BoardsController', function ($scope, $window, $location, Boards) {
  $scope.data = [];

  $scope.getBoards = function () {
    Boards.getAll()
      .then(function (data) {
          $scope.data.boards = data;
      })
      .catch(function (error) {
        console.error(error);
      });
  };

 $scope.newBoard = function () {
   Boards.getNew()
     .then(function (data) {
       $window.location = '/' + data;
     })
     .catch(function (error) {
       console.error(error);
     });
 }; 

 $scope.getBoards();

});