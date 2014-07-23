  angular.module('honoursApp').directive('redactor', function($http, socket, $timeout, TopicServices, $state) {
      return {
          restrict: 'AE',
          require: '?ngModel',
          link: function(scope, element, attrs, ngModel) {
              var updateModel = function updateModel(value) {
                      $timeout(function() {
                          ngModel.$setViewValue(value);
                      });
                  },
                  options = {
                      changeCallback: updateModel
                  },
                  additionalOptions = attrs.redactor ?
                  scope.$eval(attrs.redactor) : {},
                  editor,
                  $_element = angular.element(element);

              angular.extend(options, additionalOptions);




              // put in timeout to avoid $digest collision.  call render() to
              // set the initial value.
              $timeout(function() {
                  editor = $_element.redactor({
                      toolbar: false,
                      focus: true,
                      deniedTags: ['blockquote', 'div','span'],

                      enterCallback: function(e) {
                          
                          var c = this.getCurrent();
                          this.getCaretOffset(c);
                          if($(c.parentNode).hasClass('pg')){
                            e.preventDefault();
                            var text = this.getBlock();
                            createNewParagraph(this, element, c, e);
                          }
                          
                      },
                      blurCallback: function(e) {
                            updateModel(this.get());
                           $_element.parent().parent().removeClass('editing')
                           //Compute Diff Match and Broadcast
                           scope.computeDiff(this.get(),scope);

                      },
                      focusCallback: function(e) {
                          //updateModel(this.get());
                           $_element.parent().parent().addClass('editing');
                           //Store Original Text for Diff Matching
                          scope.storeOriginalDiff(this.get(),scope);
                          scope.update();



                      },
                      keyupCallback: function(e) {
                          updateModel(this.get());
                      },
                      keydownCallback: function(e) {
                          //updateModel(this.get());
                          
                          var c = this.getCurrent();
                          var cIndex = parseInt(attrs.in);
                          var prevIndex = cIndex - 1, nextIndex = cIndex +1;
                          var cEl = angular.element('#pg-'+cIndex);
                          var prev = angular.element('#pg-' + prevIndex);
                          var next = angular.element('#pg-' + nextIndex);
                          
                          var prevElement = cIndex - 1;
                              if (e.which === 8 && cursorParentIndex(cEl[0]) == 0) {
                                  e.preventDefault();
                                  thisElement = this.get();
                                  removeParagraph(e, thisElement);
                              }
                          if (e.which == 38 && isTopBorder(cEl[0])) {
                              //var prev = $(element).parent().parent().prev().children('div').children('div');
                              //console.log(prev);
                              
                              var getDistanceToCaret = distanceToCaret($_element, cursorParentIndex(cEl[0]));
                              var lineNumber = prev.lines().length;
                              var caretPosition = getCaretViaWidth(prev, lineNumber, getDistanceToCaret);
                              setCaret(prev.get(0), caretPosition);
                              e.preventDefault();

                          } else if (e.which == 40 && isBottomBorder(cEl[0])) {
                              e.preventDefault();
                                  var getDistanceToCaret = distanceToCaret($_element,cursorParentIndex(cEl[0]));
                                  var caretPosition = getCaretViaWidth(next, 1, getDistanceToCaret);
                                  next.focus();
                                  setCaret(next.get(0), caretPosition);
                          } else if (e.which == 37 && cursorParentIndex(cEl[0]) == 0) {
                              e.preventDefault();
                                  prev.focus();
                                  setCaret(prev.get(0), prev.text().length);
                              // if end of paragraph and right arrow
                          } else if (e.which == 39 && cursorParentIndex(cEl[0]) == $(element).text().length) {
                              e.preventDefault();
                              next.focus();
                              //$(element).parent().parent().next().children('div').children('div').focus();
                          };




                      }
                  });
                $_element.redactor('set', ngModel.$viewValue || '');
                //$_element.chromeinsertfix();

              })



                 var isTopBorder = function(element){

                var linePos = 0, paragraphs = 0;
                var limits = element.getClientRects();
                var range = rangy.createRange();
                var sel = rangy.getSelection();
                var cSel = sel.getRangeAt(0);

                
                var outerBoundary = Math.round(limits[0].top);
                var innerBoundary = Math.round(cSel.nativeRange.getClientRects()[0].top)
                var difference =  innerBoundary - outerBoundary;
                var differenceOffsetLimTop = 13;
                var differenceOffsetLimBottom = 10;

                if(difference<=differenceOffsetLimTop && difference>=differenceOffsetLimBottom){
                  return true;
                }
                return false;
              }


              var isBottomBorder = function(element){

                var linePos = 0, paragraphs = 0;
                var limits = element.getClientRects();
                var range = rangy.createRange();
                var sel = rangy.getSelection();
                var cSel = sel.getRangeAt(0);

                var outerBoundary = Math.round(limits[0].bottom);
                var innerBoundary = Math.round(cSel.nativeRange.getClientRects()[0].bottom)
                var difference =   outerBoundary -innerBoundary;
                var differenceOffsetLimTop = 13;
                var differenceOffsetLimBottom = 10;

                if(difference<=differenceOffsetLimTop && difference>=differenceOffsetLimBottom){
                  return true;
                }
                return false;
              }



              var removeParagraph = function(e, thisElement) {
                  //$_element.redactor('destroy');
                  var cIndex = parseInt(attrs.in);
                  var prevElement = cIndex - 1;

                  //Last Element Innertext + this element innertext

                  var a = angular.element('#pg-' + prevElement).redactor().get(0);
                  var b = $_element.redactor().get(0);

                  var len = a.textContent.length;
                  var oldContent = a.innerHTML;
                  var newContent = a.innerHTML + b.innerHTML;


                  
                  angular.element('#pg-' + prevElement).redactor('set', newContent);


                  scope.$apply(function() {
                      scope.$parent.TestEdit.doc.splice(cIndex, 1);
                  })
                  //angular.element('#pg-' + prevElement).redactor('focus');
                  var cur = angular.element('#pg-' + prevElement).redactor('getObject');
                  //This is touchy
                  angular.element('#pg-' + prevElement).redactor('setCaret', cur.$editor.get(0), len);

              }

              var createNewParagraph = function(e, element, text, eb) {
                  var textPastCursor = $_element.redactor('getCurrent');
                  var caratOffset = $_element.redactor('getCaretOffset', textPastCursor);

                  var cIndex = parseInt(attrs.in);
                  var current = scope.$parent.TestEdit.doc[cIndex];
                  var cEl = angular.element('#pg-' + cIndex).get(0);

                  if (caratOffset === 0) {
                      var start = cEl.innerText.substring(0, caratOffset),
                          end = cEl.innerText.substring(caratOffset);
                          
                      $_element.redactor('set', start);



                      joinLastParagraph(textPastCursor, end);
                  } else {
                      var start = cEl.innerText.substring(0, caratOffset),
                          end = cEl.innerText.substring(caratOffset);
                          
                      $_element.redactor('set', start);



                      joinLastParagraph(textPastCursor, end);
                  }



              }


              var joinLastParagraph = function(textPastCursor, end) {
                  var t = textPastCursor;
                  $_element = angular.element(element);
                  var cIndex = parseInt(attrs.in) + 1;
                  var current = scope.$parent.TestEdit.doc[cIndex];
                  //$_element.redactor('destroy');
                  var end = end.replace('</p>',"");
                  var item = {};
                  item.pg = end;

                 
                  scope.joinPara(cIndex,0,item);
                 
                  var cIndex = parseInt(attrs.in);
                  var nextEl = cIndex + 1;



                  //var cur = angular.element('#pg-' + nextEl).redactor('focus');;

                  //$_element.redactor('focus');
              }









          }
      }
  });
