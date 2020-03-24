
from django.contrib import admin
from django.urls import path

from django.http import HttpResponseRedirect
from django.conf.urls import include, url

urlpatterns = {
    url(r'^tracker/', include('tracker.urls')),
    # url(r'^$', lambda r: HttpResponseRedirect('tracker/')),

}
