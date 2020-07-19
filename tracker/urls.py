
from django.conf.urls import url
from django.urls import path
from . import views
from tracker.views import index
from django.contrib import admin

app_name = 'tracker'
urlpatterns = [
    path(r'', views.index, name='index'),
    path(r'kaliebrierung/', views.kalibrierung, name='kalibrierung'),
    path(r'anleitung/', views.anleitung, name='anleitung')

]