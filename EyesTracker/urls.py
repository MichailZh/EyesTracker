
from django.contrib import admin
from django.urls import path

from django.http import HttpResponseRedirect
from django.conf.urls import include, url
from tracker import views

urlpatterns = {
    url(r'^$', lambda r: HttpResponseRedirect('tracker/')),
    url(r'^tracker/', include('tracker.urls')),
    url(r'^tracker/kalibrierung', views.kalibrierung, name='kalibrierung'),
    url(r'^tracker/anleitung', views.anleitung, name='anleitung')
    # url(r'^$', lambda r: HttpResponseRedirect('tracker/')),

}
