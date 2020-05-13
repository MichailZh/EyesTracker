
from django.contrib import admin
from django.urls import path

from django.http import HttpResponseRedirect
from django.conf.urls import include, url
from tracker import views

urlpatterns = {
    url(r'^tracker/', include('tracker.urls')),
    url(r'^tracker/kalibrierung', views.kalibrierung, name='kalibrierung'),
    url(r'^tracker/uebungen', views.uebungen, name='uebungen')
    # url(r'^$', lambda r: HttpResponseRedirect('tracker/')),

}
